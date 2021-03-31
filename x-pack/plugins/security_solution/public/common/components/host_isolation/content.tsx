/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiTextArea,
  EuiCard,
  EuiButton,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenu,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const HostIsolationContent = React.memo(() => {
  return (
    <>
      <EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.isolateHost"
          defaultMessage="Isolate host"
        />
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
          defaultMessage="Endpoint Name is currently not isolated. Are you sure you want to isolate this host?"
        />
      </EuiText>
      <EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.comment"
          defaultMessage="Comment"
        />
      </EuiTitle>
      <EuiTextArea
        data-test-subj="host_isolation_comment"
        resize="none"
        placeholder="You may leave an optional note here"
        value="nani"
        onChange={console.log('replace this')}
      />
    </>
  );
});

HostIsolationContent.displayName = 'HostIsolationContent';

export const ChooseCaseContent = React.memo(() => {
  return (
    <>
      <EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.alertResponseActions"
          defaultMessage="Alert response actions"
        />
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.alertResponseActions.description"
          defaultMessage="This action will be added to the # cases associated with someAlert.exe."
        />
      </EuiText>
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: [
              {
                name: 'Isolate host',
                onClick: () => {
                  console.log('isolate host clicked from context menu');
                },
              },
            ],
          },
        ]}
      />
      <EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.comment"
          defaultMessage="Comment"
        />
      </EuiTitle>
      <EuiTextArea
        data-test-subj="host_isolation_comment"
        resize="none"
        placeholder="You may leave an optional note here"
        value="nani"
        onChange={console.log('replace this')}
      />
    </>
  );
  /* return (
    <>
      <EuiTitle>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.isolateHost"
          defaultMessage="Isolate host"
        />
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.hostIsolation.relatedCases"
          defaultMessage="There are no existing cases associated with this alert."
        />
      </EuiText>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiCard
            title={i18n.translate('xpack.securitySolution.endpoint.hostIsolation.newCase', {
              defaultMessage: 'Create new case',
            })}
            description={null}
            icon={<EuiIcon type="faceSad" size="xl" />}
            footer={
              <EuiButton fill={true} onClick={console.log('new')}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolation.selectButton"
                  defaultMessage="Select"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            title={i18n.translate('xpack.securitySolution.endpoint.hostIsolation.existingCase', {
              defaultMessage: 'Add to existing case',
            })}
            description={null}
            icon={<EuiIcon type="folderOpen" size="xl" />}
            footer={
              <EuiButton fill={true} onClick={console.log('existing')}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolation.selectButton"
                  defaultMessage="Select"
                />
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
    );*/
});

ChooseCaseContent.displayName = 'ChooseCaseContent';
