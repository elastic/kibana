/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import type { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DashboardContainerInput, DashboardStart } from '@kbn/dashboard-plugin/public';
import { HELLO_WORLD_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public/hello_world';
import { TODO_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public/todo';
import { TODO_REF_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public/todo/todo_ref_embeddable';
import { EuiButton } from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import type { DashboardPanelState } from '@kbn/dashboard-plugin/common';
import { useKibana } from '../../lib/kibana';
import { useSecurityDashboardSavedObjects } from '../../containers/dashboards/use_security_dashboards_table';

export const InputEditor = <T,>(props: { input: T; onSubmit: (value: T) => void }) => {
  const input = JSON.stringify(props.input, null, 4);
  const [value, setValue] = React.useState(input);
  const isValid = (() => {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  })();
  React.useEffect(() => {
    setValue(input);
  }, [input]);
  return (
    <>
      <CodeEditor
        languageId={'json'}
        value={value}
        width={'100%'}
        height={'400px'}
        onChange={(v) => setValue(v)}
        data-test-subj={'dashboardEmbeddableByValueInputEditor'}
      />
      <EuiButton
        onClick={() => props.onSubmit(JSON.parse(value))}
        disabled={!isValid}
        data-test-subj={'dashboardEmbeddableByValueInputSubmit'}
      >
        {'Update Input'}
      </EuiButton>
    </>
  );
};

const baseInput: Omit<DashboardContainerInput, 'panels'> = {
  viewMode: ViewMode.VIEW,
  // panels: {
  //   '1': {
  //     gridData: {
  //       w: 10,
  //       h: 10,
  //       x: 0,
  //       y: 0,
  //       i: '1',
  //     },
  //     type: HELLO_WORLD_EMBEDDABLE,
  //     explicitInput: {
  //       id: '1',
  //     },
  //   },
  //   '2': {
  //     gridData: {
  //       w: 10,
  //       h: 10,
  //       x: 10,
  //       y: 0,
  //       i: '2',
  //     },
  //     type: HELLO_WORLD_EMBEDDABLE,
  //     explicitInput: {
  //       id: '2',
  //     },
  //   },
  //   '3': {
  //     gridData: {
  //       w: 10,
  //       h: 10,
  //       x: 0,
  //       y: 10,
  //       i: '3',
  //     },
  //     type: TODO_EMBEDDABLE,
  //     explicitInput: {
  //       id: '3',
  //       title: 'Clean up',
  //       task: 'Clean up the code',
  //       icon: 'trash',
  //     },
  //   },
  //   '4': {
  //     gridData: {
  //       w: 10,
  //       h: 10,
  //       x: 10,
  //       y: 10,
  //       i: '4',
  //     },
  //     type: TODO_REF_EMBEDDABLE,
  //     explicitInput: {
  //       id: '4',
  //       savedObjectId: 'sample-todo-saved-object',
  //     },
  //   },
  // },
  isFullScreenMode: false,
  filters: [],
  useMargins: false,
  id: 'random-id',
  timeRange: {
    to: 'now',
    from: 'now-1d',
  },
  timeRestore: false,
  title: 'test',
  query: {
    query: '',
    language: 'lucene',
  },
  refreshConfig: {
    pause: true,
    value: 15,
  },
};

type Panels = Array<
  DashboardPanelState<
    EmbeddableInput & {
      [k: string]: unknown;
    }
  >
>;
const createInput = (panels: Panels) => ({
  ...baseInput,
  panels: Object.fromEntries(
    panels.map((panel) => [
      panel.panelIndex,
      { ...panel, explicitInput: { ...panel.embeddableConfig, id: panel.panelIndex } },
    ])
  ),
});

export const DashboardEmbeddableByValue = ({ panels }: { panels: Panels }) => {
  const input = createInput(panels);
  console.log({ input });

  const services = useKibana().services;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { getDashboardContainerByValueRenderer } = services.dashboard!;
  const DashboardContainerByValueRenderer = getDashboardContainerByValueRenderer();

  return <DashboardContainerByValueRenderer input={input} />;
};

export const DashboardEmbedded: React.FC = () => {
  const { items } = useSecurityDashboardSavedObjects();

  const firstDashboardPanels = useMemo(
    () =>
      items[0]?.attributes?.panelsJSON
        ? JSON.parse(items[0].attributes.panelsJSON.toString())
        : null,
    [items]
  );
  return firstDashboardPanels ? <DashboardEmbeddableByValue panels={firstDashboardPanels} /> : null;
};
