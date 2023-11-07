/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import faker from 'faker';
import userEvent from '@testing-library/user-event';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { euiLightVars } from '@kbn/ui-theme';
import { CustomPaletteParams, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import { VisualizationDimensionEditorProps } from '../../types';
import { MetricVisualizationState } from './visualization';
import {
  DimensionEditor,
  DimensionEditorAdditionalSection,
  SupportingVisType,
} from './dimension_editor';
import { DatasourcePublicAPI } from '../..';
import { createMockFramePublicAPI, generateActiveData } from '../../mocks';

// see https://github.com/facebook/jest/issues/4402#issuecomment-534516219
const expectCalledBefore = (mock1: jest.Mock, mock2: jest.Mock) =>
  expect(mock1.mock.invocationCallOrder[0]).toBeLessThan(mock2.mock.invocationCallOrder[0]);

const SELECTORS = {
  PRIMARY_METRIC_EDITOR: 'lnsMetricDimensionEditor_primary_metric',
  SECONDARY_METRIC_EDITOR: 'lnsMetricDimensionEditor_secondary_metric',
  MAX_EDITOR: 'lnsMetricDimensionEditor_maximum',
  BREAKDOWN_EDITOR: 'lnsMetricDimensionEditor_breakdown',
  COLOR_PICKER: 'euiColorPickerAnchor',
};

describe('dimension editor', () => {
  const palette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: 'foo',
    params: {
      rangeType: 'percent',
    },
  };

  const fullState: Required<MetricVisualizationState> = {
    layerId: 'first',
    layerType: 'data',
    metricAccessor: 'metric-col-id',
    secondaryMetricAccessor: 'secondary-metric-col-id',
    maxAccessor: 'max-metric-col-id',
    breakdownByAccessor: 'breakdown-col-id',
    collapseFn: 'sum',
    subtitle: faker.lorem.word(5),
    secondaryPrefix: faker.lorem.word(3),
    progressDirection: 'vertical',
    maxCols: 5,
    color: faker.internet.color(),
    palette,
    icon: 'tag',
    showBar: true,
    trendlineLayerId: 'second',
    trendlineLayerType: 'metricTrendline',
    trendlineMetricAccessor: 'trendline-metric-col-id',
    trendlineSecondaryMetricAccessor: 'trendline-secondary-metric-accessor',
    trendlineTimeAccessor: 'trendline-time-col-id',
    trendlineBreakdownByAccessor: 'trendline-breakdown-col-id',
  };

  const nonNumericMetricFrame = createMockFramePublicAPI({
    activeData: generateActiveData([
      {
        id: 'first',
        rows: Array(3).fill({
          'metric-col-id': faker.lorem.word(3),
          'max-col-id': faker.random.number(),
        }),
      },
    ]),
  });

  let props: VisualizationDimensionEditorProps<MetricVisualizationState> & {
    paletteService: PaletteRegistry;
  };

  beforeEach(() => {
    props = {
      layerId: 'first',
      groupId: 'some-group',
      accessor: 'some-accessor',
      state: fullState,
      datasource: {
        hasDefaultTimeField: jest.fn(() => true),
        getOperationForColumnId: jest.fn(() => ({
          hasReducedTimeRange: false,
        })),
      } as unknown as DatasourcePublicAPI,
      removeLayer: jest.fn(),
      addLayer: jest.fn(),
      frame: createMockFramePublicAPI({
        activeData: generateActiveData([
          {
            id: 'first',
            rows: Array(3).fill({
              'metric-col-id': faker.random.number(),
              'secondary-metric-col-id': faker.random.number(),
            }),
          },
        ]),
      }),
      setState: jest.fn(),
      panelRef: {} as React.MutableRefObject<HTMLDivElement | null>,
      paletteService: chartPluginMock.createPaletteRegistry(),
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('primary metric dimension', () => {
    const accessor = 'metric-col-id';
    const metricAccessorState = { ...fullState, metricAccessor: accessor };
    const mockSetState = jest.fn();

    function renderPrimaryMetricEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditor
          {...props}
          state={metricAccessorState}
          accessor={accessor}
          setState={mockSetState}
          {...overrides}
        />
      );

      const colorModeGroup = screen.queryByRole('group', { name: /color mode/i });
      const staticColorPicker = screen.queryByTestId(SELECTORS.COLOR_PICKER);

      const typeColor = (color: string) => {
        if (!staticColorPicker) {
          throw new Error('Static color picker not found');
        }
        userEvent.clear(staticColorPicker);
        userEvent.type(staticColorPicker, color);
      };

      const clearColor = () => {
        if (!staticColorPicker) {
          throw new Error('Static color picker not found');
        }
        userEvent.clear(staticColorPicker);
      };

      return {
        colorModeGroup,
        staticColorPicker,
        typeColor,
        clearColor,
        ...rtlRender,
      };
    }

    it('renders when the accessor matches', () => {
      renderPrimaryMetricEditor();
      expect(screen.getByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.MAX_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).not.toBeInTheDocument();
    });
    it('Color mode switch is shown when the primary metric is numeric', () => {
      const { colorModeGroup } = renderPrimaryMetricEditor();
      expect(colorModeGroup).toBeInTheDocument();
    });

    it('Color mode switch is not shown when the primary metric is non-numeric', () => {
      const { colorModeGroup } = renderPrimaryMetricEditor({ frame: nonNumericMetricFrame });
      expect(colorModeGroup).not.toBeInTheDocument();
    });

    describe('static color controls', () => {
      it('is hidden when dynamic coloring is enabled', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette },
        });
        expect(staticColorPicker).not.toBeInTheDocument();
      });
      it('is visible if palette is not defined', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette: undefined },
        });
        expect(staticColorPicker).toBeInTheDocument();
      });
      it('is visible when metric is non-numeric even if palette is set', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          frame: nonNumericMetricFrame,
          state: { ...metricAccessorState, palette },
        });
        expect(staticColorPicker).toBeInTheDocument();
      });

      it('fills with default value', () => {
        const { staticColorPicker } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette: undefined, color: undefined },
        });
        expect(staticColorPicker).toHaveValue(euiLightVars.euiColorPrimary.toUpperCase());
      });

      it('sets color', async () => {
        const { typeColor, clearColor } = renderPrimaryMetricEditor({
          state: { ...metricAccessorState, palette: undefined, color: faker.internet.color() },
        });

        const newColor = faker.internet.color().toUpperCase();
        typeColor(newColor);
        await waitFor(() =>
          expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ color: newColor }))
        );
        clearColor();
        await waitFor(() =>
          expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ color: undefined }))
        );

        expect(mockSetState).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('secondary metric dimension', () => {
    const accessor = 'secondary-metric-col-id';
    function renderSecondaryMetricEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditor
          {...props}
          state={{ ...fullState, secondaryMetricAccessor: accessor }}
          accessor={accessor}
          {...overrides}
        />
      );

      const customPrefixTextbox = screen.queryByRole('textbox');
      const typePrefix = (prefix: string) => {
        if (customPrefixTextbox === null) {
          throw new Error('custom prefix textbox not found');
        }
        userEvent.clear(customPrefixTextbox);
        userEvent.type(customPrefixTextbox, prefix);
      };
      return {
        settingNone: screen.getByLabelText(/none/i),
        settingAuto: screen.getByLabelText(/auto/i),
        settingCustom: screen.getByLabelText(/custom/i),
        customPrefixTextbox,
        typePrefix,
        ...rtlRender,
      };
    }

    it('renders when the accessor matches', () => {
      renderSecondaryMetricEditor();
      expect(screen.queryByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.getByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.MAX_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).not.toBeInTheDocument();
    });

    describe('metric prefix', () => {
      const NONE_PREFIX = '';
      const AUTO_PREFIX = undefined;
      const localState = {
        ...fullState,
        secondaryPrefix: AUTO_PREFIX,
        secondaryMetricAccessor: accessor,
      };
      it('correctly renders chosen auto prefix', () => {
        const { settingAuto, settingCustom, settingNone, customPrefixTextbox } =
          renderSecondaryMetricEditor({
            state: localState,
          });

        expect(settingAuto).toBeChecked();
        expect(settingNone).not.toBeChecked();
        expect(settingCustom).not.toBeChecked();
        expect(customPrefixTextbox).not.toBeInTheDocument();
      });

      it('correctly renders chosen none prefix', () => {
        const { settingAuto, settingCustom, settingNone, customPrefixTextbox } =
          renderSecondaryMetricEditor({ state: { ...localState, secondaryPrefix: NONE_PREFIX } });

        expect(settingNone).toBeChecked();
        expect(settingAuto).not.toBeChecked();
        expect(settingCustom).not.toBeChecked();
        expect(customPrefixTextbox).not.toBeInTheDocument();
      });

      it('correctly renders custom prefix', () => {
        const customPrefixState = { ...localState, secondaryPrefix: faker.lorem.word(3) };
        const { settingAuto, settingCustom, settingNone, customPrefixTextbox } =
          renderSecondaryMetricEditor({ state: customPrefixState });

        expect(settingAuto).not.toBeChecked();
        expect(settingNone).not.toBeChecked();
        expect(settingCustom).toBeChecked();
        expect(customPrefixTextbox).toHaveValue(customPrefixState.secondaryPrefix);
      });

      it('clicking on the buttons calls setState with a correct secondaryPrefix', () => {
        const customPrefix = faker.lorem.word(3);
        const setState = jest.fn();

        const { settingAuto, settingNone } = renderSecondaryMetricEditor({
          setState,
          state: { ...localState, secondaryPrefix: customPrefix },
        });

        userEvent.click(settingNone);
        expect(setState).toHaveBeenCalledWith(
          expect.objectContaining({ secondaryPrefix: NONE_PREFIX })
        );

        userEvent.click(settingAuto);
        expect(setState).toHaveBeenCalledWith(
          expect.objectContaining({ secondaryPrefix: AUTO_PREFIX })
        );
      });

      it('sets a custom prefix value', async () => {
        const customPrefix = faker.lorem.word(3);
        const setState = jest.fn();

        const { typePrefix } = renderSecondaryMetricEditor({
          setState,
          state: { ...localState, secondaryPrefix: customPrefix },
        });

        const newCustomPrefix = faker.lorem.word(3);
        typePrefix(newCustomPrefix);

        await waitFor(() =>
          expect(setState).toHaveBeenCalledWith(
            expect.objectContaining({ secondaryPrefix: newCustomPrefix })
          )
        );
      });
    });
  });

  describe('maximum dimension', () => {
    function renderMaximumDimension(overrides = {}) {
      const accessor = 'max-col-id';
      return render(
        <DimensionEditor
          {...props}
          accessor={accessor}
          state={{ ...fullState, maxAccessor: accessor }}
          {...overrides}
        />
      );
    }

    it('renders when the accessor matches', () => {
      renderMaximumDimension();
      expect(screen.queryByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.getByTestId(SELECTORS.MAX_EDITOR)).toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).not.toBeInTheDocument();
    });
  });

  describe('breakdown-by dimension', () => {
    const accessor = 'breakdown-col-id';

    const mockSetState = jest.fn();

    afterEach(() => mockSetState.mockClear());

    function renderBreakdownEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditor
          {...props}
          state={{ ...fullState, breakdownByAccessor: accessor }}
          accessor={accessor}
          setState={mockSetState}
          {...overrides}
        />
      );

      const selectCollapseBy = (collapseFn: string) => {
        const collapseBySelect = screen.getByLabelText(/collapse by/i);
        userEvent.selectOptions(collapseBySelect, collapseFn);
      };

      const setMaxCols = (maxCols: number) => {
        const maxColsInput = screen.getByLabelText(/layout columns/i);
        userEvent.clear(maxColsInput);
        userEvent.type(maxColsInput, maxCols.toString());
      };

      return {
        ...rtlRender,
        selectCollapseBy,
        setMaxCols,
      };
    }

    it('renders when the accessor matches', () => {
      renderBreakdownEditor();
      expect(screen.queryByTestId(SELECTORS.PRIMARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.SECONDARY_METRIC_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.MAX_EDITOR)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SELECTORS.BREAKDOWN_EDITOR)).toBeInTheDocument();
    });

    it('supports setting a collapse function', () => {
      const { selectCollapseBy } = renderBreakdownEditor();
      const newCollapseFn = 'min';
      selectCollapseBy(newCollapseFn);

      expect(mockSetState).toHaveBeenCalledWith({ ...fullState, collapseFn: newCollapseFn });
    });

    it('sets max columns', async () => {
      const { setMaxCols } = renderBreakdownEditor();
      setMaxCols(1);
      await waitFor(() =>
        expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ maxCols: 1 }))
      );
      setMaxCols(2);
      await waitFor(() =>
        expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ maxCols: 2 }))
      );
      setMaxCols(3);
      await waitFor(() =>
        expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ maxCols: 3 }))
      );
    });
  });

  describe('additional section', () => {
    const accessor = 'metric-col-id';
    const metricAccessorState = { ...fullState, metricAccessor: accessor };
    const mockSetState = jest.fn();

    afterEach(() => mockSetState.mockClear());

    function renderAdditionalSectionEditor(overrides = {}) {
      const rtlRender = render(
        <DimensionEditorAdditionalSection
          {...props}
          setState={mockSetState}
          state={metricAccessorState}
          accessor={accessor}
          {...overrides}
        />
      );

      const supportingVisOptions = {
        none: screen.queryByLabelText(/none/i),
        // in eui when bar or line become disabled they change from input to button so we have to do this weird check
        bar: screen.queryByLabelText(/bar/i) || screen.queryByRole('button', { name: /bar/i }),
        trendline:
          screen.queryByLabelText(/line/i) || screen.queryByRole('button', { name: /line/i }),
      };

      const clickOnSupportingVis = (type: SupportingVisType) => {
        const supportingVis = supportingVisOptions[type];
        if (!supportingVis) {
          throw new Error(`Supporting visualization ${type} not found`);
        }
        userEvent.click(supportingVis);
      };

      return {
        progressDirectionShowing: screen.queryByTestId('lnsMetric_progress_direction_buttons'),
        progressOptions: {
          vertical: screen.queryByLabelText(/vertical/i),
          horizontal: screen.queryByLabelText(/horizontal/i),
        },
        supportingVisOptions,
        clickOnSupportingVis,
        ...rtlRender,
      };
    }

    it.each([
      { name: 'secondary metric', accessor: metricAccessorState.secondaryMetricAccessor },
      { name: 'max', accessor: metricAccessorState.maxAccessor },
      { name: 'break down by', accessor: metricAccessorState.breakdownByAccessor },
    ])('doesnt show for the following dimension: %s', ({ accessor: testAccessor }) => {
      const { container } = renderAdditionalSectionEditor({ accessor: testAccessor });
      expect(container).toBeEmptyDOMElement();
    });

    describe('supporting visualizations', () => {
      const stateWOTrend = {
        ...metricAccessorState,
        trendlineLayerId: undefined,
      };

      describe('reflecting visualization state', () => {
        it('when `showBar` is false and maximum value is not defined, option none should be selected', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: { ...stateWOTrend, showBar: false, maxAccessor: undefined },
          });
          expect(supportingVisOptions.none).toBeChecked();
        });

        it('when `showBar` is true and maximum value is not defined, bar should be selected', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: { ...stateWOTrend, showBar: true },
          });
          expect(supportingVisOptions.bar).toBeChecked();
        });

        it('when `showBar` is true and trendline is defined, line should be selected', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });
          expect(supportingVisOptions.trendline).toBeChecked();
        });

        it('should enable bar when max dimension exists', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: {
              ...stateWOTrend,
              showBar: false,
              maxAccessor: 'something',
            },
          });
          expect(supportingVisOptions.bar).not.toBeDisabled();
        });

        it('should disable bar when max dimension does not exist', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            state: {
              ...stateWOTrend,
              showBar: false,
              maxAccessor: undefined,
            },
          });
          expect(supportingVisOptions.bar).toBeDisabled();
        });

        it('should disable trendline when no default time field', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor({
            datasource: {
              ...props.datasource,
              hasDefaultTimeField: () => false,
            },
          });
          expect(supportingVisOptions.trendline).toBeDisabled();
        });

        it('should enable trendline when default time field exists', () => {
          const { supportingVisOptions } = renderAdditionalSectionEditor();
          expect(supportingVisOptions.trendline).not.toBeDisabled();
        });
      });

      it('should disable trendline when a metric dimension has a reduced time range', () => {
        const { supportingVisOptions } = renderAdditionalSectionEditor({
          datasource: {
            ...props.datasource,
            getOperationForColumnId: (id: string) => ({
              hasReducedTimeRange: id === stateWOTrend.metricAccessor,
            }),
          },
        });
        expect(supportingVisOptions.trendline).toBeDisabled();
      });

      it('should not show a trendline button group when primary metric dimension is non-numeric', () => {
        const { container } = renderAdditionalSectionEditor({
          frame: nonNumericMetricFrame,
        });
        expect(container).toBeEmptyDOMElement();
      });

      describe('responding to buttons', () => {
        it('enables trendline', async () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({ state: stateWOTrend });
          clickOnSupportingVis('trendline');

          expect(mockSetState).toHaveBeenCalledWith({ ...stateWOTrend, showBar: false });
          expect(props.addLayer).toHaveBeenCalledWith('metricTrendline');
          expectCalledBefore(mockSetState, props.addLayer as jest.Mock);
        });

        it('enables bar', () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });
          clickOnSupportingVis('bar');

          expect(mockSetState).toHaveBeenCalledWith({ ...metricAccessorState, showBar: true });
          expect(props.removeLayer).toHaveBeenCalledWith(metricAccessorState.trendlineLayerId);

          expectCalledBefore(mockSetState, props.removeLayer as jest.Mock);
        });

        it('selects none from bar', () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({
            state: stateWOTrend,
          });
          clickOnSupportingVis('none');

          expect(mockSetState).toHaveBeenCalledWith({ ...stateWOTrend, showBar: false });
          expect(props.removeLayer).not.toHaveBeenCalled();
        });

        it('selects none from trendline', () => {
          const { clickOnSupportingVis } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });
          clickOnSupportingVis('none');

          expect(mockSetState).toHaveBeenCalledWith({ ...metricAccessorState, showBar: false });
          expect(props.removeLayer).toHaveBeenCalledWith(metricAccessorState.trendlineLayerId);

          expectCalledBefore(mockSetState, props.removeLayer as jest.Mock);
        });
      });

      describe('progress bar direction controls', () => {
        it('hides direction controls if bar not showing', () => {
          const { progressDirectionShowing } = renderAdditionalSectionEditor({
            state: { ...stateWOTrend, showBar: false },
          });
          expect(progressDirectionShowing).not.toBeInTheDocument();
        });

        it('toggles progress direction', () => {
          const { progressOptions } = renderAdditionalSectionEditor({
            state: metricAccessorState,
          });

          expect(progressOptions.vertical).toBeChecked();
          expect(progressOptions.horizontal).not.toBeChecked();
          if (progressOptions.horizontal === null) {
            throw new Error('horizontal radio button not found');
          }

          userEvent.click(progressOptions.horizontal);

          expect(mockSetState).toHaveBeenCalledWith({
            ...metricAccessorState,
            progressDirection: 'horizontal',
          });
        });
      });
    });
  });
});
