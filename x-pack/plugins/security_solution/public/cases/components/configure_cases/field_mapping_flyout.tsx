/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
} from '@elastic/eui';
import styled from 'styled-components';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select';
import { ActionType, CaseField, CasesConfigurationMapping } from '../../containers/configure/types';
import { ActionConnector } from '../../../../../triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useActionsConnectorsContext } from '../../../../../triggers_actions_ui/public/common';
import * as i18n from './translations';
import { useGetFields } from '../../containers/use_get_fields';
import { FieldMappingRow } from './field_mapping_row_new';
import { FieldResponse } from '../../../../../case/common/api/cases';
import { setActionTypeToMapping } from './utils';
interface Props {
  connector: ActionConnector;
  onClose: () => void;
}
const actionTypeOptions: Array<EuiSuperSelectOption<ActionType>> = [
  {
    value: 'nothing',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_NOTHING}</>,
    'data-test-subj': 'edit-update-option-nothing',
  },
  {
    value: 'overwrite',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_OVERWRITE}</>,
    'data-test-subj': 'edit-update-option-overwrite',
  },
  {
    value: 'append',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_APPEND}</>,
    'data-test-subj': 'edit-update-option-append',
  },
];

const getThirdPartyOptions = (
  thirdPartyFields: FieldResponse
): Array<EuiSuperSelectOption<string>> =>
  thirdPartyFields.reduce<Array<EuiSuperSelectOption<string>>>(
    (acc, field) => {
      return [
        ...acc,
        {
          value: field.id,
          inputDisplay: <span>{field.name}</span>,
          'data-test-subj': `dropdown-mapping-${field.id}`,
        },
      ];
    },
    [
      {
        value: 'not_mapped',
        inputDisplay: i18n.MAPPING_FIELD_NOT_MAPPED,
        'data-test-subj': 'dropdown-mapping-not_mapped',
      },
    ]
  );

export const createDefaultMapping = (fields: FieldResponse): CasesConfigurationMapping[] => {
  const titleTarget =
    (
      fields.find((field) => field.type === 'text' && field.required) ??
      fields.find((field) => field.type === 'text')
    )?.id ?? '';
  const remainingFields = fields.filter((field) => field.id !== titleTarget);
  const descriptionTarget =
    (
      remainingFields.find((field) => field.type === 'textarea' && field.required) ??
      remainingFields.find((field) => field.type === 'textarea') ??
      remainingFields.find((field) => field.type === 'text')
    )?.id ?? '';
  return [
    {
      source: 'title',
      target: titleTarget,
      actionType: 'overwrite',
    },
    {
      source: 'description',
      target: descriptionTarget,
      actionType: 'overwrite',
    },
    {
      source: 'comments',
      target: 'comments',
      actionType: 'append',
    },
  ];
};

const loadingFieldsDefault: CasesConfigurationMapping[] = [
  {
    source: 'title',
    target: 'not_mapped',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'not_mapped',
    actionType: 'overwrite',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];
export const setThirdPartyToMapping = (
  caseField: CaseField,
  newThirdPartyField: string,
  mapping: CasesConfigurationMapping[]
): CasesConfigurationMapping[] =>
  mapping.map((item) => {
    if (item.source !== caseField && item.target === newThirdPartyField) {
      return { ...item, target: 'not_mapped' };
    } else if (item.source === caseField) {
      return { ...item, target: newThirdPartyField };
    }
    return item;
  });

const CallOut = styled(EuiCallOut)`
  margin-top: 10px;
`;
export const FieldMappingFlyout = ({ connector, onClose }: Props) => {
  const { actionTypeRegistry } = useActionsConnectorsContext();
  const { fields, isLoading: isFieldsLoading } = useGetFields(connector.id, connector.actionTypeId);
  const closeFlyout = useCallback(() => {
    onClose();
  }, [onClose]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const onSaveClicked = useCallback(
    (closeAfterSave: boolean = true) => {
      setIsSaving(true);
      // TO DO SAVE
      setIsSaving(false);
      if (closeAfterSave) {
        closeFlyout();
      }
    },
    [closeFlyout]
  );
  const actionTypeModel = useMemo(() => actionTypeRegistry.get(connector.actionTypeId), [
    actionTypeRegistry,
    connector.actionTypeId,
  ]);
  const thirdPartyOptions = useMemo(() => (fields.length ? getThirdPartyOptions(fields) : []), [
    fields,
  ]);
  const [newMapping, setNewMapping] = useState<CasesConfigurationMapping[]>([]);

  const defaultMapping = useMemo(
    () => (fields.length ? createDefaultMapping(fields) : loadingFieldsDefault),
    [fields]
  );

  const activeMapping = useMemo(() => (newMapping.length ? newMapping : defaultMapping), [
    defaultMapping,
    newMapping,
  ]);
  const onChangeActionType = useCallback(
    (caseField: CaseField, newActionType: ActionType) => {
      setNewMapping(setActionTypeToMapping(caseField, newActionType, activeMapping));
    },
    [activeMapping]
  );

  const onChangeThirdParty = useCallback(
    (caseField: CaseField, newThirdPartyField: string) => {
      setNewMapping(setThirdPartyToMapping(caseField, newThirdPartyField, activeMapping));
    },
    [activeMapping, setNewMapping]
  );

  const mappingComponent = useMemo(
    () =>
      activeMapping.map((item) => {
        const selectedAlready = activeMapping.reduce<string[]>(
          (acc, itt) =>
            itt.source !== item.source && itt.target !== 'not_mapped' ? [...acc, itt.target] : acc,
          []
        );

        return (
          <FieldMappingRow
            actionTypeOptions={actionTypeOptions}
            disabled={isFieldsLoading}
            id={item.source}
            key={item.source}
            onChangeActionType={onChangeActionType}
            onChangeThirdParty={onChangeThirdParty}
            securitySolutionField={item.source}
            selectedActionType={item.actionType}
            selectedThirdParty={item.target ?? 'not_mapped'}
            thirdPartyOptions={thirdPartyOptions.filter(
              (opt) => !selectedAlready.includes(opt.value)
            )}
          />
        );
      }),
    [activeMapping, isFieldsLoading, onChangeActionType, onChangeThirdParty, thirdPartyOptions]
  );

  const requiredFields = useMemo(
    () => fields.reduce((acc: string[], f) => (f.required ? [...acc, f.id] : acc), []),
    [fields]
  );

  const validateFields = useMemo(() => {
    if (isFieldsLoading) {
      return null;
    }
    // strictly typed, but these will definitely be strings. see createDefaultMapping.. Blerg typescript
    const titleMapping = activeMapping.find((m) => m.source === 'title')?.target as string;
    const descMapping = activeMapping.find((m) => m.source === 'description')?.target as string;
    if (titleMapping === 'not_mapped' && descMapping === 'not_mapped') {
      return i18n.BLANK_MAPPINGS(connector.name);
    } else if (!requiredFields.includes(titleMapping) && !requiredFields.includes(descMapping)) {
      return i18n.REQUIRED_MAPPINGS(connector.name, JSON.stringify(requiredFields));
    }
    return null;
  }, [activeMapping, connector.name, isFieldsLoading, requiredFields]);
  const isSaveDisabled = useMemo(() => isFieldsLoading || validateFields != null, [
    isFieldsLoading,
    validateFields,
  ]);
  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionEditTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {actionTypeModel ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="m" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>{i18n.EDIT_FIELD_MAPPING_TITLE(connector.name)}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {mappingComponent}
        {validateFields != null && (
          <CallOut title={validateFields} color="warning" iconType="help" />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>{i18n.CANCEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="secondary"
                  data-test-subj="saveMappingsActionButton"
                  isDisabled={isSaveDisabled}
                  isLoading={isSaving}
                  onClick={() => onSaveClicked(false)}
                >
                  {i18n.SAVE}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="secondary"
                  data-test-subj="saveAndCloseMappingsActionButton"
                  fill
                  isDisabled={isSaveDisabled}
                  isLoading={isSaving}
                  onClick={() => onSaveClicked()}
                >
                  {i18n.SAVE_CLOSE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
