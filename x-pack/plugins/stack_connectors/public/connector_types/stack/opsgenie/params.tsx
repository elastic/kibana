/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect, RecursivePartial } from '@elastic/eui';
import { cloneDeep, isEqual, set } from 'lodash';
import type {
  OpsgenieActionParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieCreateAlertParams,
  OpsgenieCreateAlertSubActionParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';

type SubActionProps<SubActionParams> = Omit<
  ActionParamsProps<OpsgenieActionParams>,
  'actionParams' | 'editAction'
> & {
  actionParams: Partial<SubActionParams>;
  editSubAction: ActionParamsProps<OpsgenieActionParams>['editAction'];
};

const CreateAlertComponent: React.FC<SubActionProps<OpsgenieCreateAlertSubActionParams>> = ({
  actionParams,
  editSubAction,
  errors,
  index,
  messageVariables,
}) => {
  return (
    <>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubAction}
        messageVariables={messageVariables}
        paramsProperty={'message'}
        inputTargetValue={actionParams.subActionParams?.message}
        errors={errors['subActionParams.message'] as string[]}
        label={i18n.MESSAGE_FIELD_LABEL}
      />
      <EuiFormRow data-test-subj="alias-row" fullWidth label={i18n.ALIAS_FIELD_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={actionParams.subActionParams?.alias}
        />
      </EuiFormRow>
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlertComponent';

const CloseAlertComponent: React.FC<SubActionProps<OpsgenieCloseAlertSubActionParams>> = ({
  actionParams,
  editSubAction,
  errors,
  index,
  messageVariables,
}) => {
  const isAliasInvalid =
    errors['subActionParams.alias'] !== undefined &&
    errors['subActionParams.alias'].length > 0 &&
    actionParams.subActionParams?.alias !== undefined;

  return (
    <>
      <EuiFormRow
        data-test-subj="alias-row"
        fullWidth
        error={errors['subActionParams.alias']}
        isInvalid={isAliasInvalid}
        label={i18n.ALIAS_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={actionParams.subActionParams?.alias}
          errors={errors['subActionParams.alias'] as string[]}
        />
      </EuiFormRow>
    </>
  );
};

CloseAlertComponent.displayName = 'CloseAlertComponent';

interface SubActionState {
  createAlert: RecursivePartial<OpsgenieCreateAlertParams>;
  closeAlert: RecursivePartial<OpsgenieCreateAlertParams>;
}

const OpsgenieParamFields: React.FC<ActionParamsProps<OpsgenieActionParams>> = ({
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const { subAction, subActionParams } = actionParams;
  const defaultedSubAction = useMemo(() => subAction ?? 'createAlert', [subAction]);

  const [subActionParamsState, setSubActionParamsState] = useState<SubActionState>({
    createAlert: {},
    closeAlert: {},
  });

  const actionOptions = [
    {
      value: 'createAlert',
      text: i18n.CREATE_ALERT_ACTION,
    },
    {
      value: 'closeAlert',
      text: i18n.CLOSE_ALERT_ACTION,
    },
  ];

  const onActionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      editAction('subAction', event.target.value, index);
    },
    [editAction, index]
  );

  const editSubAction = useCallback(
    (key, value) => {
      setSubActionParamsState((previousState) => {
        const stateCopy = cloneDeep(previousState);
        set(stateCopy, `${defaultedSubAction}.${key}`, value);

        return stateCopy;
      });

      editAction(
        'subActionParams',
        { ...subActionParamsState[defaultedSubAction], [key]: value },
        index
      );
    },
    [editAction, subActionParamsState, defaultedSubAction, index]
  );

  useEffect(() => {
    /**
     * Unfortunately I'm not able to do two editAction calls right after each other. For whatever reason the first call
     * gets ignored. Ideally when the subAction is changed I can grab the subActionParams for that particular action and
     * call editAction. This would be done in the onActionChange callback but it doesn't work. So instead when the
     * component rerenders because the subAction changes we'll check to see if the params are different, if so then we'll
     * assume we need to switch to the saved state.
     *
     * This shouldn't cause unnecessary rerenders because the state should be updated whenever editAction would be called
     * with a subActionParams change, so the subActionParams and state should only be unequal when the subAction is
     * changed the initially
     */
    if (!isEqual(subActionParams, subActionParamsState[defaultedSubAction])) {
      editAction('subActionParams', subActionParamsState[defaultedSubAction], index);
    }
  }, [defaultedSubAction, editAction, index, subActionParams, subActionParamsState]);

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', 'createAlert', index);
    }

    if (!subActionParams) {
      editAction('subActionParams', {}, index);
    }
    // TODO: should this depend on editAction?
  }, [editAction, index, subAction, subActionParams]);

  return (
    <>
      <EuiFormRow fullWidth label={i18n.ACTION_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="eventActionSelect"
          options={actionOptions}
          hasNoInitialSelection={subAction == null}
          value={subAction}
          onChange={onActionChange}
        />
      </EuiFormRow>

      {isCreateAlertAction(actionParams) ? (
        <CreateAlertComponent
          actionParams={actionParams}
          editSubAction={editSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      ) : (
        <CloseAlertComponent
          actionParams={actionParams}
          editSubAction={editSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}
    </>
  );
};

OpsgenieParamFields.displayName = 'OpsgenieParamFields';

// eslint-disable-next-line import/no-default-export
export { OpsgenieParamFields as default };

const isCreateAlertAction = (
  params: Partial<OpsgenieActionParams>
): params is Partial<OpsgenieCreateAlertSubActionParams> => params.subAction === 'createAlert';
