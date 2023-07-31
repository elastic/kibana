/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiShowFor,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { forwardRef, useContext, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Moment } from 'moment';
import moment from 'moment';

const CustomInput = forwardRef(
  ({ onClick, value }: { onClick: () => void; value: string }, ref) => (
    <EuiFlexGroup direction={'row'} onClick={onClick} style={{ gap: 5 }}>
      <EuiText size="m" data-test-subj="protection-updates-version-to-deploy">
        {value}
      </EuiText>
      <EuiFlexItem style={{ justifyContent: 'center' }}>
        <EuiIcon type="calendar" color={'primary'} />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
CustomInput.displayName = 'CustomInput';

export const ProtectionUpdatesLayout = () => {
  const paddingSize = useContext(ThemeContext).eui.euiPanelPaddingModifiers.paddingMedium;
  const [automaticUpdates, setAutomaticUpdates] = useState(true);
  const today = moment();
  const cutoffDate = moment().subtract(18, 'months');
  const [startDate, setStartDate] = useState<Moment | null>(today);

  const renderVersionToDeployPicker = () => {
    return (
      <>
        <EuiTitle
          size="xxs"
          data-test-subj={'protection-updates-manifest-name-version-to-deploy-title'}
        >
          <h5>
            {i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.versionToDeploy.label',
              {
                defaultMessage: 'Version to deploy',
              }
            )}
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiDatePicker
          popoverPlacement={'upCenter'}
          dateFormat={'DD MMMM, YYYY'}
          customInput={<CustomInput />}
          selected={startDate}
          maxDate={today}
          minDate={cutoffDate}
          onChange={setStartDate}
        />
      </>
    );
  };

  const renderContent = () => {
    if (automaticUpdates) {
      return (
        <EuiText size="m" data-test-subj="protection-updates-automatic-updates-enabled">
          {i18n.translate(
            'xpack.securitySolution.endpoint.protectionUpdates.automaticUpdates.enabled',
            {
              defaultMessage:
                'Manifest will always be updated to the latest available version. If you want to control updates manually, disable "Update manifest automatically".',
            }
          )}
        </EuiText>
      );
    }
    return (
      <>
        <EuiTitle
          size="xxs"
          data-test-subj={'protection-updates-manifest-name-deployed-version-title'}
        >
          <h5>
            {i18n.translate(
              'xpack.securitySolution.endpoint.protectionUpdates.deployedVersion.label',
              {
                defaultMessage: 'Currently deployed version',
              }
            )}
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiText size="m" data-test-subj="protection-updates-deployed-version">
          {'17 July, 2023 @ 12:20:40 PM'}
        </EuiText>
        <EuiSpacer size="l" />
        {renderVersionToDeployPicker()}

        <EuiSpacer size="m" />
        <EuiTitle size="xxs" data-test-subj={'protection-updates-manifest-name-comment-title'}>
          <h5>
            {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.comment.label', {
              defaultMessage: 'Comment',
            })}
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiTextArea
          value={''}
          onChange={() => console.log('test')}
          fullWidth={true}
          disabled={false}
          data-test-subj={'protection-updates-manifest-name-comment'}
        />
        <EuiSpacer size="m" />

        <EuiButton
          fill={true}
          iconType="save"
          data-test-subj="policyDetailsSaveButton"
          onClick={() => console.log('test')}
          isLoading={false}
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.protectionUpdates.saveButton"
            defaultMessage="Save updates"
          />
        </EuiButton>
      </>
    );
  };

  return (
    <EuiPanel
      data-test-subject="protection-updates-layout"
      hasBorder={true}
      hasShadow={false}
      paddingSize="none"
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="none"
        alignItems="center"
        style={{ padding: `${paddingSize} ${paddingSize} 0 ${paddingSize}` }}
      >
        <EuiFlexItem grow={1}>
          <EuiTitle size="xxs" data-test-subj={'protection-updates-manifest-name-title'}>
            <h5>
              {i18n.translate('xpack.securitySolution.endpoint.protectionUpdates.manifestName', {
                defaultMessage: 'Manifest name',
              })}
            </h5>
          </EuiTitle>
          <EuiText size="m" data-test-subj="protection-updates-manifest-name">
            {'artifactsec'}
          </EuiText>
        </EuiFlexItem>
        <EuiShowFor sizes={['l', 'xl', 'm']}>
          <EuiSwitch
            label={'Update manifest automatically'}
            labelProps={{ 'data-test-subj': 'protection-updates-manifest-switch-label' }}
            checked={automaticUpdates}
            onChange={(event) => setAutomaticUpdates(event.target.checked)}
            data-test-subj={'protection-updates-manifest-switch'}
          />
        </EuiShowFor>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />
      <EuiSpacer size="l" />

      <div style={{ padding: `0 ${paddingSize} ${paddingSize} ${paddingSize}` }}>
        {renderContent()}
      </div>
    </EuiPanel>
  );
};
