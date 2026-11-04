/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import {
  DEFAULT_TIME_RANGE,
  EDGE_CASE_DASHBOARDS,
  EDGE_CASE_INDEX,
  EDGE_CASE_MAPPINGS,
  SAMPLE_DATA_SETS,
  THEMES,
  allChartsHaveDebugState,
  buildEdgeCaseDocuments,
  capturePaths,
  centerPanel,
  createCaptureWriter,
  cropScreenshot,
  flattenAsCodePanels,
  getVisualizationRefId,
  listRenderedPanelIds,
  readInspectorTables,
  readPanel,
  readRenderContext,
  resolveTimeRange,
  toDashboardRequestBody,
  toGlobalStateQuery,
  withoutVolatileMeta,
} from '@kbn/isomer-corpus';
import type {
  AsCodePanel,
  AsCodePanelEntry,
  PanelPlacement,
  PanelReading,
  RenderContextReading,
  Theme,
  TimeRange,
} from '@kbn/isomer-corpus';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';
import { AS_CODE_API_VERSION, getRunSettings, installSampleData } from './corpus_run';

const WINDOW_SIZE = { width: 1600, height: 1200 } as const;
const OPEN_INSPECTOR_SUBJ = 'embeddablePanelAction-openInspector';
/** Settings pinned for the whole run, so captures don't depend on the machine that ran them. */
const PINNED_UI_SETTINGS = { 'dateFormat:tz': 'UTC' } as const;
const DEBUG_STATE_TIMEOUT_MS = 60_000;
/** Room for Kibana's header above a centered panel. */
const VIEWPORT_MARGIN = 200;

interface CorpusDashboard {
  /** Directory name for the dashboard's captures. */
  name: string;
  source: 'sample_data' | 'edge_case';
  resolveId: () => string | undefined;
}

interface DashboardUnderCapture {
  id: string;
  title: string;
  panels: AsCodePanel[];
  /** Panels the as-code API left out (`dropped_panel` warnings); they still render. */
  droppedPanelCount: number;
  timeRange: { relative: TimeRange; absolute: TimeRange };
}

interface InspectorReading {
  status: string;
  adapters?: string[];
  tables?: Record<string, unknown>;
  error?: string;
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const elasticChart = getService('elasticChart');
  const es = getService('es');
  const find = getService('find');
  const inspector = getService('inspector');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  const { common, dashboard, header, timePicker } = getPageObjects([
    'common',
    'dashboard',
    'header',
    'timePicker',
  ]);

  const { now, outputRoot, onlyDashboards } = getRunSettings();
  const writer = createCaptureWriter(outputRoot);
  let sampleDashboardIds = new Map<string, string>();

  const corpus: CorpusDashboard[] = [
    ...SAMPLE_DATA_SETS.map(
      (dataSet): CorpusDashboard => ({
        name: `sample-${dataSet}`,
        source: 'sample_data',
        resolveId: () => sampleDashboardIds.get(dataSet),
      })
    ),
    ...EDGE_CASE_DASHBOARDS.map(
      ({ id }): CorpusDashboard => ({ name: id, source: 'edge_case', resolveId: () => id })
    ),
  ].filter(({ name }) => !onlyDashboards || onlyDashboards.includes(name));

  const getAsCode = async (path: string) => {
    const { body } = await supertest
      .get(path)
      .set('elastic-api-version', AS_CODE_API_VERSION)
      .expect(200);
    return body;
  };

  const installEdgeCases = async () => {
    await es.indices.delete({ index: EDGE_CASE_INDEX, ignore_unavailable: true });
    await es.indices.create({ index: EDGE_CASE_INDEX, mappings: EDGE_CASE_MAPPINGS });
    await es.bulk({
      refresh: 'wait_for',
      operations: buildEdgeCaseDocuments().flatMap((document) => [
        { index: { _index: EDGE_CASE_INDEX } },
        document,
      ]),
    });
    for (const edgeCaseDashboard of EDGE_CASE_DASHBOARDS) {
      await supertest
        .put(`/api/dashboards/${edgeCaseDashboard.id}`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', AS_CODE_API_VERSION)
        .send(toDashboardRequestBody(edgeCaseDashboard))
        .expect(({ status }) => {
          if (status !== 200 && status !== 201) {
            throw new Error(`Creating ${edgeCaseDashboard.id} returned ${status}`);
          }
        });
    }
  };

  /** Loads the as-code dashboard and every by-reference visualization, and stores them. */
  const loadDashboard = async ({ name }: CorpusDashboard, id: string) => {
    const response = await getAsCode(`/api/dashboards/${id}`);
    writer.writeJson(capturePaths.dashboard(name), withoutVolatileMeta(response));

    const panels = flattenAsCodePanels(response.data.panels as AsCodePanelEntry[]);
    for (const panel of panels) {
      const refId = getVisualizationRefId(panel);
      const visualization = refId
        ? withoutVolatileMeta(await getAsCode(`/api/visualizations/${refId}`))
        : undefined;
      if (refId) {
        writer.writeJson(capturePaths.visualization(name, refId), visualization);
      }
      writer.writeJson(capturePaths.panelConfig(name, panel.id), {
        dashboard_id: id,
        in_as_code: true,
        panel,
        ...(visualization ? { visualization } : {}),
      });
    }

    const relative: TimeRange = response.data.time_range ?? DEFAULT_TIME_RANGE;
    return {
      id,
      title: response.data.title as string,
      panels,
      droppedPanelCount: (response.warnings ?? []).filter(
        ({ type }: { type: string }) => type === 'dropped_panel'
      ).length,
      timeRange: {
        relative,
        absolute: resolveTimeRange(relative, now, PINNED_UI_SETTINGS['dateFormat:tz']),
      },
    };
  };

  const readJson = async <T>(json: Promise<string>): Promise<T> => JSON.parse(await json) as T;

  const openDashboard = async (target: DashboardUnderCapture, theme: Theme) => {
    await kibanaServer.uiSettings.update({
      'theme:darkMode': theme === 'dark' ? 'enabled' : 'disabled',
    });
    await common.navigateToUrl(
      'dashboard',
      `/view/${target.id}?${toGlobalStateQuery(target.timeRange.absolute)}`,
      { useActualUrl: true, ensureCurrentUrl: false }
    );
    await header.waitUntilLoadingHasFinished();
    await dashboard.waitForRenderComplete();

    // Charts only attach `DebugState` when the flag is on as they render, so refetch to redraw.
    await elasticChart.setNewChartUiDebugFlag(true);
    await queryBar.clickQuerySubmitButton();
    await header.waitUntilLoadingHasFinished();
    await dashboard.waitForRenderComplete();

    let debugStateComplete = true;
    try {
      await retry.waitForWithTimeout('charts to report DebugState', DEBUG_STATE_TIMEOUT_MS, () =>
        browser.execute(allChartsHaveDebugState)
      );
    } catch (error) {
      debugStateComplete = false;
      log.warning(`[${target.id}] not every chart reported DebugState: ${error.message}`);
    }

    const context = await readJson<RenderContextReading>(browser.execute(readRenderContext));
    if (!context.themeTag?.endsWith(theme)) {
      throw new Error(`Expected the ${theme} theme, but the page reports ${context.themeTag}`);
    }
    // FTR's navigation adds a `_t` cache buster to the URL; it's different on every run.
    const url = new URL(context.url);
    url.searchParams.delete('_t');
    const timePickerRange = await timePicker.getTimeConfigAsAbsoluteTimes();
    const renderedPanelIds = await readJson<string[]>(browser.execute(listRenderedPanelIds));
    return {
      context: { ...context, url: url.toString() },
      debugStateComplete,
      timePickerRange,
      renderedPanelIds,
    };
  };

  const getHoverActionsAnchor = (panelId: string): Promise<WebElementWrapper> =>
    find.byCssSelector(`#panel-${panelId} .embPanel__hoverActionsAnchor`);

  const readPanelTables = async (panelId: string): Promise<InspectorReading> => {
    const anchor = await getHoverActionsAnchor(panelId);
    if (!(await testSubjects.descendantExists(OPEN_INSPECTOR_SUBJ, anchor))) {
      await dashboardPanelActions.openContextMenu(anchor);
      if (!(await testSubjects.waitForExists(OPEN_INSPECTOR_SUBJ, { timeout: 1000 }))) {
        await browser.pressKeys(browser.keys.ESCAPE);
        return { status: 'no_inspect_action' };
      }
    }
    await dashboardPanelActions.openInspector(anchor);
    await testSubjects.existOrFail('inspectorPanel', { timeout: 10_000 });
    const reading = await readJson<InspectorReading>(browser.execute(readInspectorTables));
    await inspector.close();
    return reading;
  };

  /** Screenshots one panel; a panel taller than the viewport gets a taller window, then it's reset. */
  const screenshotPanel = async (panelId: string): Promise<Buffer> => {
    const place = () => readJson<PanelPlacement>(browser.execute(centerPanel, panelId));
    let placement = await place();
    const tallerWindow =
      placement.rect.height > placement.viewport.height - VIEWPORT_MARGIN
        ? WINDOW_SIZE.height + Math.ceil(placement.rect.height)
        : undefined;
    if (tallerWindow) {
      await browser.setWindowSize(WINDOW_SIZE.width, tallerWindow);
      placement = await place();
    }
    try {
      const screenshot = await browser.getScreenshotAsBitmap();
      return cropScreenshot(
        screenshot,
        placement.rect,
        screenshot.width / placement.viewport.width
      );
    } finally {
      if (tallerWindow) {
        await browser.setWindowSize(WINDOW_SIZE.width, WINDOW_SIZE.height);
      }
    }
  };

  const capturePanel = async (
    corpusDashboard: CorpusDashboard,
    target: DashboardUnderCapture,
    panel: AsCodePanel,
    inAsCode: boolean,
    theme: Theme,
    page: Awaited<ReturnType<typeof openDashboard>>
  ) => {
    const reading = await readJson<PanelReading>(browser.execute(readPanel, panel.id));
    writer.writeBinary(
      capturePaths.panelScreenshot(corpusDashboard.name, panel.id, theme),
      await screenshotPanel(panel.id)
    );

    let inspectorReading: InspectorReading;
    try {
      inspectorReading = await readPanelTables(panel.id);
    } catch (error) {
      inspectorReading = { status: 'error', error: error.message };
      await inspector.close();
    }

    writer.writeJson(capturePaths.panelCapture(corpusDashboard.name, panel.id, theme), {
      dashboard_id: target.id,
      panel_id: panel.id,
      in_as_code: inAsCode,
      panel_type: inAsCode ? panel.type : null,
      chart_type: typeof panel.config.type === 'string' ? panel.config.type : null,
      theme,
      context: {
        now: now.toISOString(),
        time_range: target.timeRange,
        time_picker: page.timePickerRange,
        ui_settings: PINNED_UI_SETTINGS,
        page: page.context,
        grid: inAsCode ? panel.grid : null,
        size: reading.rect ? { width: reading.rect.width, height: reading.rect.height } : null,
      },
      debug_state_complete: page.debugStateComplete,
      panel: reading,
      inspector: inspectorReading,
    });

    return { reading, inspectorReading };
  };

  describe('capture', function () {
    const writeRunRecord = (status: { version?: { number?: string; build_hash?: string } }) =>
      writer.writeJson(capturePaths.run(), {
        now: now.toISOString(),
        kibana: { version: status.version?.number, build_hash: status.version?.build_hash },
        window_size: WINDOW_SIZE,
        ui_settings: PINNED_UI_SETTINGS,
        themes: THEMES,
        dashboards: corpus.map(({ name, source, resolveId }) => ({
          name,
          source,
          id: resolveId() ?? null,
        })),
      });

    before(async () => {
      await kibanaServer.uiSettings.update(PINNED_UI_SETTINGS);
      sampleDashboardIds = await installSampleData(supertest, now, { reinstall: true });
      await installEdgeCases();
      await browser.setWindowSize(WINDOW_SIZE.width, WINDOW_SIZE.height);

      // A run limited to some dashboards leaves the full run's record alone.
      const { body: status } = await supertest.get('/api/status').expect(200);
      if (!onlyDashboards) {
        writeRunRecord(status);
      }
      log.info(`Writing Isomer corpus captures to ${outputRoot}`);
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('theme:darkMode');
    });

    for (const corpusDashboard of corpus) {
      describe(corpusDashboard.name, () => {
        let target: DashboardUnderCapture;

        before(async () => {
          const id = corpusDashboard.resolveId();
          if (!id) {
            throw new Error(`No dashboard ID for ${corpusDashboard.name}`);
          }
          target = await loadDashboard(corpusDashboard, id);
        });

        for (const theme of THEMES) {
          it(`captures every panel in ${theme}`, async () => {
            const page = await openDashboard(target, theme);
            const panels: Array<Record<string, unknown>> = [];
            const asCodeIds = new Set(target.panels.map(({ id }) => id));
            const droppedPanels = page.renderedPanelIds
              .filter((id) => !asCodeIds.has(id))
              .map(
                (id): AsCodePanel => ({
                  id,
                  type: '',
                  grid: {},
                  config: {},
                  inCollapsedSection: false,
                })
              );
            for (const { id } of droppedPanels) {
              writer.writeJson(capturePaths.panelConfig(corpusDashboard.name, id), {
                dashboard_id: target.id,
                in_as_code: false,
                panel: null,
              });
            }

            for (const panel of [...target.panels, ...droppedPanels]) {
              const inAsCode = asCodeIds.has(panel.id);
              if (panel.inCollapsedSection) {
                panels.push({ id: panel.id, status: 'skipped_collapsed_section' });
                continue;
              }
              try {
                const { reading, inspectorReading } = await capturePanel(
                  corpusDashboard,
                  target,
                  panel,
                  inAsCode,
                  theme,
                  page
                );
                panels.push({
                  id: panel.id,
                  in_as_code: inAsCode,
                  status: reading.found ? 'captured' : 'not_rendered',
                  charts: reading.charts.length,
                  charts_with_debug_state: reading.charts.filter(({ debugState }) => debugState)
                    .length,
                  metrics: reading.metrics.length,
                  data_grids: reading.dataGrids.length,
                  inspector: inspectorReading.status,
                  error: reading.errorText,
                });
              } catch (error) {
                log.warning(`[${target.id}/${panel.id}] capture failed: ${error.message}`);
                panels.push({ id: panel.id, status: 'failed', error: error.message });
              }
            }

            writer.writeJson(capturePaths.summary(corpusDashboard.name, theme), {
              dashboard_id: target.id,
              title: target.title,
              theme,
              debug_state_complete: page.debugStateComplete,
              dropped_from_as_code: {
                warnings: target.droppedPanelCount,
                rendered: droppedPanels.length,
              },
              panels,
            });
          });
        }
      });
    }
  });
}
