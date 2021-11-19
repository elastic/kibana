import { htmlIdGenerator } from '@elastic/eui';
import React, { useState, useCallback, ReactNode } from 'react';
import { RuntimeAttachment as RuntimeAttachmentStateless } from './runtime_attachment';

export const STAGED_DISCOVERY_RULE_ID = 'STAGED_DISCOVERY_RULE_ID';
export const DISCOVERY_RULE_TYPE_ALL = 'all';

interface IDiscoveryRule {
  operation: string;
  type: string;
  probe: string;
}

export type IDiscoveryRuleList = Array<{
  id: string;
  discoveryRule: IDiscoveryRule;
}>;

interface Props {
  onChange?: () => void;
  toggleDescription: ReactNode;
  discoveryRulesDescription: ReactNode;
  showUnsavedWarning?: boolean;
  initialDiscoveryRules?: IDiscoveryRule[];
  operationTypes: Operation[];
}

interface Option {
  value: string;
  label: string;
}

export interface Operation {
  operation: Option;
  types: Option[];
}

export function RuntimeAttachment(props: Props) {
  const { initialDiscoveryRules = [] } = props;
  const [isEnabled, setIsEnabled] = useState(true);
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

  const onToggleEnable = useCallback(() => {
    setIsEnabled(!isEnabled);
    setDiscoveryRuleList([]);
  }, [isEnabled]);

  const onDelete = useCallback(
    (discoveryRuleId: string) => {
      const filteredDiscoveryRuleList = discoveryRuleList.filter(
        ({ id }) => id !== discoveryRuleId
      );
      setDiscoveryRuleList(filteredDiscoveryRuleList);
    },
    [discoveryRuleList]
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
  }, [
    editDiscoveryRuleId,
    stagedOperationText,
    stagedTypeText,
    stagedProbeText,
    discoveryRuleList,
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
  }, [discoveryRuleList]);
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
    />
  );
}

const generateId = htmlIdGenerator();
