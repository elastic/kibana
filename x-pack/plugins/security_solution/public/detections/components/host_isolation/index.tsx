/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
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
  ({
    details,
    cancelCallback,
  }: {
    details: TimelineEventsDetailsItem[];
    cancelCallback: () => void;
  }) => {
    const [comment, setComment] = useState('');

    const agentId = _.find(details, { category: 'agent', field: 'agent.id' })?.values[0];
    const hostName = _.find(details, { category: 'host', field: 'host.name' })?.values[0];
    // TODO what is the correct value this should display
    const alertName = _.find(details, { category: 'file', field: 'file.path.text' })?.values[0];

    const { loading, isolateHost } = useHostIsolation({ agentId, comment });
    const [isIsolated, setIsolated] = useState(false);

    const confirmHostIsolation = async () => {
      const hostIsolated = await isolateHost();
      setIsolated(hostIsolated);
    };

    return isIsolated ? (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          iconType="check"
          color="success"
          title={i18n.translate('xpack.securitySolution.hostIsolation.successfulIsolation.title', {
            defaultMessage: 'Host Isolation on [hostname] successfully submitted',
          })}
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolation.successfulIsolation.cases"
                defaultMessage="This case has been attached to the following cases:"
              />
            </p>
          </EuiText>
        </EuiCallOut>
      </>
    ) : (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
              defaultMessage="Isolate host {hostName} from network. This action will be added to the # cases associated with the {alertName}."
              values={{ hostName, alertName }}
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
            <EuiButtonEmpty onClick={() => cancelCallback()}>
              <FormattedMessage
                id="xpack.securitySolution.hostIsolation.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={confirmHostIsolation} isLoading={loading}>
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
