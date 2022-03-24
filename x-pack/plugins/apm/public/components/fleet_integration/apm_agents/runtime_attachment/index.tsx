/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  htmlIdGenerator,
  euiDragDropReorder,
  DropResult,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import React, { useState, useCallback, ReactNode } from 'react';
import { RuntimeAttachment as RuntimeAttachmentStateless } from './runtime_attachment';

export const STAGED_DISCOVERY_RULE_ID = 'STAGED_DISCOVERY_RULE_ID';
export const DISCOVERY_RULE_TYPE_ALL = 'all';

export interface IDiscoveryRule {
  operation: string;
  type: string;
  probe: string;
}

export type IDiscoveryRuleList = Array<{
  id: string;
  discoveryRule: IDiscoveryRule;
}>;

export interface RuntimeAttachmentSettings {
  enabled: boolean;
  discoveryRules: IDiscoveryRule[];
  version: string | null;
}

interface Props {
  onChange?: (runtimeAttachmentSettings: RuntimeAttachmentSettings) => void;
  toggleDescription: ReactNode;
  discoveryRulesDescription: ReactNode;
  showUnsavedWarning?: boolean;
  initialIsEnabled?: boolean;
  initialDiscoveryRules?: IDiscoveryRule[];
  operationTypes: Operation[];
  selectedVersion: string;
  versions: string[];
}

interface Option {
  value: string;
  label: string;
  description?: string;
}

export interface Operation {
  operation: Option;
  types: Option[];
}

const versionRegex = new RegExp(/^\d+\.\d+\.\d+$/);
function validateVersion(version: string) {
  return versionRegex.test(version);
}

export function RuntimeAttachment(props: Props) {
  const { initialDiscoveryRules = [], onChange = () => {} } = props;
  const [isEnabled, setIsEnabled] = useState(Boolean(props.initialIsEnabled));
  const [discoveryRuleList, setDiscoveryRuleList] =
    useState<IDiscoveryRuleList>(
      initialDiscoveryRules.map((discoveryRule) => ({
        id: generateId(),
        discoveryRule,
      }))
    );
  const [editDiscoveryRuleId, setEditDiscoveryRuleId] = useState<null | string>(
    null
  );
  const [version, setVersion] = useState(props.selectedVersion);
  const [versions, setVersions] = useState(props.versions);
  const [isValidVersion, setIsValidVersion] = useState(
    validateVersion(version)
  );

  const onToggleEnable = useCallback(() => {
    const nextIsEnabled = !isEnabled;
    setIsEnabled(nextIsEnabled);
    onChange({
      enabled: nextIsEnabled,
      discoveryRules: nextIsEnabled
        ? discoveryRuleList.map(({ discoveryRule }) => discoveryRule)
        : [],
      version: nextIsEnabled ? version : null,
    });
  }, [isEnabled, onChange, discoveryRuleList, version]);

  const onDelete = useCallback(
    (discoveryRuleId: string) => {
      const filteredDiscoveryRuleList = discoveryRuleList.filter(
        ({ id }) => id !== discoveryRuleId
      );
      setDiscoveryRuleList(filteredDiscoveryRuleList);
      onChange({
        enabled: isEnabled,
        discoveryRules: filteredDiscoveryRuleList.map(
          ({ discoveryRule }) => discoveryRule
        ),
        version,
      });
    },
    [isEnabled, discoveryRuleList, onChange, version]
  );

  const onEdit = useCallback(
    (discoveryRuleId: string) => {
      const editingDiscoveryRule = discoveryRuleList.find(
        ({ id }) => id === discoveryRuleId
      );
      if (editingDiscoveryRule) {
        const {
          discoveryRule: { operation, type, probe },
        } = editingDiscoveryRule;
        setStagedOperationText(operation);
        setStagedTypeText(type);
        setStagedProbeText(probe);
        setEditDiscoveryRuleId(discoveryRuleId);
      }
    },
    [discoveryRuleList]
  );

  const [stagedOperationText, setStagedOperationText] = useState('');
  const [stagedTypeText, setStagedTypeText] = useState('');
  const [stagedProbeText, setStagedProbeText] = useState('');

  const onChangeOperation = useCallback(
    (operationText: string) => {
      setStagedOperationText(operationText);
      const selectedOperationTypes = props.operationTypes.find(
        ({ operation }) => operationText === operation.value
      );
      const selectedTypeAvailable = selectedOperationTypes?.types.some(
        ({ value }) => stagedTypeText === value
      );
      if (!selectedTypeAvailable) {
        setStagedTypeText(selectedOperationTypes?.types[0].value ?? '');
      }
    },
    [props.operationTypes, stagedTypeText]
  );

  const onChangeType = useCallback((operationText: string) => {
    setStagedTypeText(operationText);
    if (operationText === DISCOVERY_RULE_TYPE_ALL) {
      setStagedProbeText('');
    }
  }, []);

  const onChangeProbe = useCallback((operationText: string) => {
    setStagedProbeText(operationText);
  }, []);

  const onCancel = useCallback(() => {
    if (editDiscoveryRuleId === STAGED_DISCOVERY_RULE_ID) {
      onDelete(STAGED_DISCOVERY_RULE_ID);
    }
    setEditDiscoveryRuleId(null);
  }, [editDiscoveryRuleId, onDelete]);

  const onSubmit = useCallback(() => {
    const editDiscoveryRuleIndex = discoveryRuleList.findIndex(
      ({ id }) => id === editDiscoveryRuleId
    );
    const editDiscoveryRule = discoveryRuleList[editDiscoveryRuleIndex];
    const nextDiscoveryRuleList = [
      ...discoveryRuleList.slice(0, editDiscoveryRuleIndex),
      {
        id:
          editDiscoveryRule.id === STAGED_DISCOVERY_RULE_ID
            ? generateId()
            : editDiscoveryRule.id,
        discoveryRule: {
          operation: stagedOperationText,
          type: stagedTypeText,
          probe: stagedProbeText,
        },
      },
      ...discoveryRuleList.slice(editDiscoveryRuleIndex + 1),
    ];
    setDiscoveryRuleList(nextDiscoveryRuleList);
    setEditDiscoveryRuleId(null);
    onChange({
      enabled: isEnabled,
      discoveryRules: nextDiscoveryRuleList.map(
        ({ discoveryRule }) => discoveryRule
      ),
      version,
    });
  }, [
    isEnabled,
    editDiscoveryRuleId,
    stagedOperationText,
    stagedTypeText,
    stagedProbeText,
    discoveryRuleList,
    onChange,
    version,
  ]);

  const onAddRule = useCallback(() => {
    const firstOperationType = props.operationTypes[0];
    const operationText = firstOperationType.operation.value;
    const typeText = firstOperationType.types[0].value;
    const valueText = '';
    setStagedOperationText(operationText);
    setStagedTypeText(typeText);
    setStagedProbeText(valueText);
    const nextDiscoveryRuleList = [
      {
        id: STAGED_DISCOVERY_RULE_ID,
        discoveryRule: {
          operation: operationText,
          type: typeText,
          probe: valueText,
        },
      },
      ...discoveryRuleList,
    ];
    setDiscoveryRuleList(nextDiscoveryRuleList);
    setEditDiscoveryRuleId(STAGED_DISCOVERY_RULE_ID);
  }, [discoveryRuleList, props.operationTypes]);

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (source && destination) {
        const nextDiscoveryRuleList = euiDragDropReorder(
          discoveryRuleList,
          source.index,
          destination.index
        );
        setDiscoveryRuleList(nextDiscoveryRuleList);
        onChange({
          enabled: isEnabled,
          discoveryRules: nextDiscoveryRuleList.map(
            ({ discoveryRule }) => discoveryRule
          ),
          version,
        });
      }
    },
    [isEnabled, discoveryRuleList, onChange, version]
  );

  function onChangeVersion(nextVersion?: string) {
    if (!nextVersion) {
      return;
    }
    setVersion(nextVersion);
    onChange({
      enabled: isEnabled,
      discoveryRules: isEnabled
        ? discoveryRuleList.map(({ discoveryRule }) => discoveryRule)
        : [],
      version: nextVersion,
    });
  }

  function onCreateNewVersion(
    newVersion: string,
    flattenedOptions: Array<EuiComboBoxOptionOption<string>>
  ) {
    const normalizedNewVersion = newVersion.trim().toLowerCase();
    const isNextVersionValid = validateVersion(normalizedNewVersion);
    setIsValidVersion(isNextVersionValid);
    if (!normalizedNewVersion || !isNextVersionValid) {
      return;
    }

    // Create the option if it doesn't exist.
    if (
      flattenedOptions.findIndex(
        (option) => option.label.trim().toLowerCase() === normalizedNewVersion
      ) === -1
    ) {
      setVersions([...versions, newVersion]);
    }

    onChangeVersion(newVersion);
  }

  return (
    <RuntimeAttachmentStateless
      isEnabled={isEnabled}
      onToggleEnable={onToggleEnable}
      discoveryRuleList={discoveryRuleList}
      setDiscoveryRuleList={setDiscoveryRuleList}
      onDelete={onDelete}
      editDiscoveryRuleId={editDiscoveryRuleId}
      onEdit={onEdit}
      onChangeOperation={onChangeOperation}
      stagedOperationText={stagedOperationText}
      onChangeType={onChangeType}
      stagedTypeText={stagedTypeText}
      onChangeProbe={onChangeProbe}
      stagedProbeText={stagedProbeText}
      onCancel={onCancel}
      onSubmit={onSubmit}
      onAddRule={onAddRule}
      operationTypes={props.operationTypes}
      toggleDescription={props.toggleDescription}
      discoveryRulesDescription={props.discoveryRulesDescription}
      showUnsavedWarning={props.showUnsavedWarning}
      onDragEnd={onDragEnd}
      selectedVersion={version}
      versions={versions}
      onChangeVersion={(selectedVersions) => {
        const nextVersion: string | undefined = selectedVersions[0]?.label;
        const isNextVersionValid = validateVersion(nextVersion);
        setIsValidVersion(isNextVersionValid);
        onChangeVersion(nextVersion);
      }}
      onCreateNewVersion={onCreateNewVersion}
      isValidVersion={isValidVersion}
    />
  );
}

const generateId = htmlIdGenerator();
