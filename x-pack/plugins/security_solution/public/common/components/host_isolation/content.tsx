/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiTitle, EuiText, EuiTextArea, EuiSpacer, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

export const HostIsolationContent = React.memo(() => {
  const [comment, setComment] = useState('');
  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolation.isolateHost"
            defaultMessage="Isolate host"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
            defaultMessage="Endpoint-name is currently not isolated. Are you sure you want to isolate this host?"
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
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value)}
      />
    </>
  );
});

HostIsolationContent.displayName = 'HostIsolationContent';

const SelectTitle = styled(EuiTitle)`
  color: ${(props) => props.theme.eui.euiColorPrimary};
`;

export const SelectCaseContent = React.memo(() => {
  const [comment, setComment] = useState('');
  const options = [
    {
      value: 'isolate_host',
      text: i18n.translate('xpack.securitySolution.endpoint.hostIsolation.isolateHost', {
        defaultMessage: 'Isolate host',
      }),
    },
  ];

  const [selectValue, setSelectValue] = useState(options[0].value);

  const onChange = (e) => {
    setSelectValue(e.target.value);
  };

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolation.alertResponseActions"
            defaultMessage="Alert response actions"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolation.alertResponseActions.description"
            defaultMessage="This action will be added to the # cases associated with someAlert.exe."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <SelectTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolation.alertResponseActions.selectTitle"
            defaultMessage="Select a response action"
          />
        </h4>
      </SelectTitle>
      <EuiSelect
        id="hostIsolationSelectCase"
        fullWidth
        options={options}
        value={selectValue}
        onChange={(e) => onChange(e)}
      />
      <EuiSpacer size="l" />
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
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value)}
      />
    </>
  );
});

SelectCaseContent.displayName = 'SelectCaseContent';
