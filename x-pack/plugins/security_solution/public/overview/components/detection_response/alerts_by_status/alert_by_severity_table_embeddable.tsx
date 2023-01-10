/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useRefetchByRestartingSession } from '../../../../common/components/page/use_refetch_by_session';
import { getAlertsBySeverityTableAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_by_severity_table';
import { LensEmbeddable } from '../../../../common/components/visualization_actions/lens_embeddable';
import { inputsActions } from '../../../../common/store/inputs';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import type { AlertDonutEmbeddableProps } from './types';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from './types';

const ChartSize = '135px';

const AlertBySeverityTableEmbeddableComponent: React.FC<AlertDonutEmbeddableProps> = ({
  filters,
  timerange,
}) => {
  const dispatch = useDispatch();
  const queryId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-table`;
  const { searchSessionId, refetchByRestartingSession } = useRefetchByRestartingSession({
    inputId: InputsModelId.global,
    queryId,
  });

  const extraOptions = useMemo(() => ({ filters }), [filters]);

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId: InputsModelId.global,
        id: queryId,
        searchSessionId,
        refetch: refetchByRestartingSession,
        loading: false,
        inspect: null,
      })
    );
  }, [dispatch, queryId, refetchByRestartingSession, searchSessionId]);

  return (
    <LensEmbeddable
      timerange={timerange}
      extraOptions={extraOptions}
      height={ChartSize}
      getLensAttributes={getAlertsBySeverityTableAttributes}
      stackByField="kibana.alert.workflow_status"
      scopeId={SourcererScopeName.detections}
      id={queryId}
    />
  );
};

export const AlertBySeverityTableEmbeddable = React.memo(AlertBySeverityTableEmbeddableComponent);
