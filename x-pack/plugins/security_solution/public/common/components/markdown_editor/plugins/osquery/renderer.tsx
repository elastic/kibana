/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// receives the configuration from the parser and renders
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { reduce } from 'lodash';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiButton } from '@elastic/eui';
import { BasicAlertDataContext } from '../../../event_details/investigation_guide_view';
import { expandDottedObject } from '../../../../../../common/utils/expand_dotted';
import type { Ecs } from '../../../../../../common/ecs';
import OsqueryLogo from './osquery_icon/osquery.svg';
import { OsqueryFlyout } from '../../../../../detections/components/osquery/osquery_flyout';

const StyledEuiButton = styled(EuiButton)`
  > span > img {
    margin-block-end: 0;
  }
`;

export const OsqueryRenderer = ({
  configuration,
}: {
  configuration: {
    label?: string;
    query: string;
    ecs_mapping: { [key: string]: {} };
    test: [];
  };
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { agentId, alertId, data } = useContext(BasicAlertDataContext);

  const handleOpen = useCallback(() => setShowFlyout(true), [setShowFlyout]);

  const handleClose = useCallback(() => setShowFlyout(false), [setShowFlyout]);

  const ecsData = useMemo(() => {
    const fieldsMap: Record<string, string> = reduce(
      data,
      (acc, eventDetailItem) => ({
        ...acc,
        [eventDetailItem.field]: eventDetailItem?.values?.[0],
      }),
      {}
    );
    return expandDottedObject(fieldsMap) as Ecs;
  }, [data]);

  return (
    <>
      <StyledEuiButton iconType={OsqueryLogo} onClick={handleOpen}>
        {configuration.label ??
          i18n.translate('xpack.securitySolution.markdown.osquery.runOsqueryButtonLabel', {
            defaultMessage: 'Run Osquery',
          })}
      </StyledEuiButton>
      {showFlyout && (
        <OsqueryFlyout
          defaultValues={{
            ...(alertId ? { alertIds: [alertId] } : {}),
            query: configuration.query,
            ecs_mapping: configuration.ecs_mapping,
            queryField: false,
          }}
          agentId={agentId}
          onClose={handleClose}
          ecsData={ecsData}
        />
      )}
    </>
  );
};
