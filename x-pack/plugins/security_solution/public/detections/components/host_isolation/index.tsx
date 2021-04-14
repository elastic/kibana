/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiTitle,
  EuiText,
  EuiTextArea,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import { useHostIsolation } from '../../containers/detection_engine/alerts/use_host_isolation';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';

export const HostIsolationPanel = React.memo(
  ({ details }: { details: TimelineEventsDetailsItem[] }) => {
    const [comment, setComment] = useState('');

    const agentId = _.find(details, { category: 'agent', field: 'agent.id' })?.values[0];
    const hostName = _.find(details, { category: 'host', field: 'host.name' })?.values[0];
    const alertName = _.find(details, { category: 'host', field: 'host.name' })?.values[0];

    // TODO put this inside a useEffect
    const { loading } = useHostIsolation({ agentId });

    return (
      <>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
              defaultMessage="Isolate host {hostname} from network. This action will be added to # cases associated with the {alertName}."
              values={({ hostName }, { alertName })}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolation.comment"
              defaultMessage="Comment"
            />
          </h4>
        </EuiTitle>
        <EuiTextArea
          data-test-subj="host_isolation_comment"
          fullWidth={true}
          placeholder={i18n.translate(
            'xpack.securitySolution.endpoint.hostIsolation.comment.placeholder',
            { defaultMessage: 'You may leave an optional note here.' }
          )}
          value={comment}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setComment(event.target.value)
          }
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => console.log('cancel')}>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolation.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={() => console.log('confirm')} isLoading={loading}>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolation.confirm"
                defaultMessage="Confirm"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
