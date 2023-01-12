import React from 'react';
import { css } from '@emotion/css';
import { EuiButtonGroup, EuiPanel } from '@elastic/eui';
import { ANALYZE_EVENT, SESSION_VIEW, GRAPH } from './translations';
import * as i18n from './translations';
import { ANALYZE_EVENT_ID } from './analyze_event';
import { SESSION_VIEW_ID } from './session_view';

export const VisualizeNavigation = ({
  activeVisualizationId,
  setActiveVisualizationId,
}: {
  activeVisualizationId: string;
  setActiveVisualizationId(id: string): void;
}) => {
  const visualizeButtons = [
    {
      id: ANALYZE_EVENT_ID,
      label: ANALYZE_EVENT,
    },
    {
      id: SESSION_VIEW_ID,
      label: SESSION_VIEW,
    },
    {
      id: 'graph',
      label: GRAPH,
    },
  ];

  const onChangeCompressed = (optionId: string) => {
    setActiveVisualizationId(optionId);
  };

  return (
    <EuiPanel
      hasShadow={false}
      css={css`
        width: 100%;
        min-height: 0;
      `}
      paddingSize="s"
      grow={false}
    >
      <EuiButtonGroup
        name="coarsness"
        legend={i18n.VISUALIZATION_OPTIONS}
        options={visualizeButtons}
        idSelected={activeVisualizationId}
        onChange={(id) => onChangeCompressed(id)}
        buttonSize="compressed"
        isFullWidth
      />
    </EuiPanel>
  );
};
