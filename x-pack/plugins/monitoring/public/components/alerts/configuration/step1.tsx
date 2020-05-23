/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSuperSelect,
  EuiToolTip,
  EuiCallOut,
} from '@elastic/eui';
import { omit, pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Legacy } from '../../../legacy_shims';
import { ActionResult, BASE_ACTION_API_PATH } from '../../../../../../plugins/actions/common';
import { ManageEmailAction, EmailActionData } from '../manage_email_action';
import { ALERT_ACTION_TYPE_EMAIL } from '../../../../common/constants';
import { NEW_ACTION_ID } from './configuration';

export interface GetStep1Props {
  onActionDone: () => Promise<void>;
  emailActions: ActionResult[];
  selectedEmailActionId: string;
  setSelectedEmailActionId: (id: string) => void;
  emailAddress: string;
  editAction: ActionResult | null;
  setEditAction: (action: ActionResult | null) => void;
}

export const Step1: React.FC<GetStep1Props> = (props: GetStep1Props) => {
  const [isTesting, setIsTesting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [testingStatus, setTestingStatus] = React.useState<string | boolean | null>(null);
  const [fullTestingError, setFullTestingError] = React.useState('');

  async function createEmailAction(data: EmailActionData) {
    if (props.editAction) {
      await Legacy.shims.kfetch({
        method: 'PUT',
        pathname: `${BASE_ACTION_API_PATH}/action/${props.editAction.id}`,
        body: JSON.stringify({
          name: props.editAction.name,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
      props.setEditAction(null);
    } else {
      await Legacy.shims.kfetch({
        method: 'POST',
        pathname: `${BASE_ACTION_API_PATH}/action`,
        body: JSON.stringify({
          name: i18n.translate('xpack.monitoring.alerts.configuration.emailAction.name', {
            defaultMessage: 'Email action for Stack Monitoring alerts',
          }),
          actionTypeId: ALERT_ACTION_TYPE_EMAIL,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    }

    await props.onActionDone();
  }

  async function deleteEmailAction(id: string) {
    setIsDeleting(true);

    await Legacy.shims.kfetch({
      method: 'DELETE',
      pathname: `${BASE_ACTION_API_PATH}/action/${id}`,
    });

    if (props.editAction && props.editAction.id === id) {
      props.setEditAction(null);
    }
    if (props.selectedEmailActionId === id) {
      props.setSelectedEmailActionId('');
    }
    await props.onActionDone();
    setIsDeleting(false);
    setTestingStatus(null);
  }

  async function testEmailAction() {
    setIsTesting(true);
    setTestingStatus(null);

    const params = {
      subject: 'Kibana alerting test configuration',
      message: `This is a test for the configured email action for Kibana alerting.`,
      to: [props.emailAddress],
    };

    const result = await Legacy.shims.kfetch({
      method: 'POST',
      pathname: `${BASE_ACTION_API_PATH}/action/${props.selectedEmailActionId}/_execute`,
      body: JSON.stringify({ params }),
    });
    if (result.status === 'ok') {
      setTestingStatus(true);
    } else {
      setTestingStatus(false);
      setFullTestingError(result.message);
    }
    setIsTesting(false);
  }

  function getTestButton() {
    const isTestingDisabled = !props.emailAddress || props.emailAddress.length === 0;
    const testBtn = (
      <EuiButton
        size="s"
        iconType="play"
        onClick={testEmailAction}
        isLoading={isTesting}
        isDisabled={isTestingDisabled}
      >
        {i18n.translate('xpack.monitoring.alerts.configuration.testConfiguration.buttonText', {
          defaultMessage: 'Test',
        })}
      </EuiButton>
    );

    if (isTestingDisabled) {
      return (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.monitoring.alerts.configuration.testConfiguration.disabledTooltipText',
            {
              defaultMessage: 'Please configure an email address below to test this action.',
            }
          )}
        >
          {testBtn}
        </EuiToolTip>
      );
    }

    return testBtn;
  }

  if (props.editAction) {
    return (
      <Fragment>
        <EuiText>
          <p>
            {i18n.translate('xpack.monitoring.alerts.configuration.step1.editAction', {
              defaultMessage: 'Edit the action below.',
            })}
          </p>
        </EuiText>
        <EuiSpacer />
        <ManageEmailAction
          createEmailAction={async (data: EmailActionData) => await createEmailAction(data)}
          cancel={() => props.setEditAction(null)}
          isNew={false}
          action={props.editAction}
        />
      </Fragment>
    );
  }

  const newAction = (
    <EuiText>
      {i18n.translate('xpack.monitoring.alerts.configuration.newActionDropdownDisplay', {
        defaultMessage: 'Create new email action...',
      })}
    </EuiText>
  );

  const options = [
    ...props.emailActions.map((action) => {
      const actionLabel = i18n.translate(
        'xpack.monitoring.alerts.configuration.selectAction.inputDisplay',
        {
          defaultMessage: 'From: {from}, Service: {service}',
          values: {
            service: action.config.service,
            from: action.config.from,
          },
        }
      );

      return {
        value: action.id,
        inputDisplay: <EuiText>{actionLabel}</EuiText>,
        dropdownDisplay: <EuiText>{actionLabel}</EuiText>,
      };
    }),
    {
      value: NEW_ACTION_ID,
      inputDisplay: newAction,
      dropdownDisplay: newAction,
    },
  ];

  let selectBox: React.ReactNode | null = (
    <EuiSuperSelect
      options={options}
      valueOfSelected={props.selectedEmailActionId}
      onChange={(id) => props.setSelectedEmailActionId(id)}
      hasDividers
    />
  );
  let createNew = null;
  if (props.selectedEmailActionId === NEW_ACTION_ID) {
    createNew = (
      <EuiPanel>
        <ManageEmailAction
          createEmailAction={async (data: EmailActionData) => await createEmailAction(data)}
          isNew={true}
        />
      </EuiPanel>
    );

    // If there are no actions, do not show the select box as there are no choices
    if (props.emailActions.length === 0) {
      selectBox = null;
    } else {
      // Otherwise, add a spacer
      selectBox = (
        <Fragment>
          {selectBox}
          <EuiSpacer />
        </Fragment>
      );
    }
  }

  let manageConfiguration = null;
  const selectedEmailAction = props.emailActions.find(
    (action) => action.id === props.selectedEmailActionId
  );

  if (
    props.selectedEmailActionId !== NEW_ACTION_ID &&
    props.selectedEmailActionId &&
    selectedEmailAction
  ) {
    let testingStatusUi = null;
    if (testingStatus === true) {
      testingStatusUi = (
        <Fragment>
          <EuiSpacer />
          <EuiText color="secondary">
            <p>
              {i18n.translate('xpack.monitoring.alerts.configuration.testConfiguration.success', {
                defaultMessage: 'Looks good on our end!',
              })}
            </p>
          </EuiText>
        </Fragment>
      );
    } else if (testingStatus === false) {
      testingStatusUi = (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut
            title={i18n.translate('xpack.monitoring.alerts.configuration.step1.testingError', {
              defaultMessage:
                'Unable to send test email. Please double check your email configuration.',
            })}
            color="danger"
            iconType="alert"
          >
            <p>{fullTestingError}</p>
          </EuiCallOut>
        </Fragment>
      );
    }

    manageConfiguration = (
      <Fragment>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="pencil"
              onClick={() => {
                const editAction =
                  props.emailActions.find((action) => action.id === props.selectedEmailActionId) ||
                  null;
                props.setEditAction(editAction);
              }}
            >
              {i18n.translate(
                'xpack.monitoring.alerts.configuration.editConfiguration.buttonText',
                {
                  defaultMessage: 'Edit',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{getTestButton()}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="danger"
              iconType="trash"
              onClick={() => deleteEmailAction(props.selectedEmailActionId)}
              isLoading={isDeleting}
            >
              {i18n.translate(
                'xpack.monitoring.alerts.configuration.deleteConfiguration.buttonText',
                {
                  defaultMessage: 'Delete',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {testingStatusUi}
      </Fragment>
    );
  }

  return (
    <Fragment>
      {selectBox}
      {manageConfiguration}
      {createNew}
    </Fragment>
  );
};
