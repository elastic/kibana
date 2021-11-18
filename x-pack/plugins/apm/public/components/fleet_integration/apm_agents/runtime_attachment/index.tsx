import React, { useState, useCallback } from 'react';
import { RuntimeAttachment as RuntimeAttachmentStateless } from './runtime_attachment';
// import {
//   NewPackagePolicy,
//   PackagePolicy,
//   PackagePolicyEditExtensionComponentProps,
// } from '../apm_policy_form/typings';

interface Props {
  // policy: PackagePolicy;
  // newPolicy: NewPackagePolicy;
  // onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}

export function RuntimeAttachment(props: Props) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [list, setList] = useState([
    {
      id: 'main java-opbeans-10010',
      content: {
        include: true,
        key: 'main',
        value: 'java-opbeans-10010',
      },
    },
    {
      id: 'pid 10948653898867',
      content: {
        include: false,
        key: 'pid',
        value: '10948653898867',
      },
    },
  ]);
  const [editItemId, setEditItemId] = useState<null | string>(null);

  const onToggleEnable = useCallback(() => {
    setIsEnabled(!isEnabled);
    setList([]);
  }, [isEnabled]);

  const onDelete = useCallback(
    (discoveryItemId: string) => {
      const filteredList = list.filter(({ id }) => id !== discoveryItemId);
      setList(filteredList);
    },
    [list]
  );

  const onEdit = useCallback(
    (discoveryItemId: string | null) => {
      const editingDiscoveryRule = list.find(
        ({ id }) => id === discoveryItemId
      );
      if (editingDiscoveryRule) {
        const {
          content: { include, key, value },
        } = editingDiscoveryRule;
        setStagedOperationText(include ? 'Include' : 'Exclude');
        setStagedTypeText(key);
        setStagedProbeText(value);
        setEditItemId(discoveryItemId);
      }
    },
    [list]
  );

  const [stagedOperationText, setStagedOperationText] = useState('');
  const onChangeOperation = useCallback((operationText: string) => {
    setStagedOperationText(operationText);
  }, []);

  const [stagedTypeText, setStagedTypeText] = useState('');
  const onChangeType = useCallback((operationText: string) => {
    setStagedTypeText(operationText);
  }, []);

  const [stagedProbeText, setStagedProbeText] = useState('');
  const onChangeProbe = useCallback((operationText: string) => {
    setStagedProbeText(operationText);
  }, []);

  const onCancel = useCallback(() => {
    if (editItemId === 'new') {
      onDelete('new');
    }
    setEditItemId(null);
  }, [editItemId, onDelete]);

  const onSubmit = useCallback(() => {
    const editItemIndex = list.findIndex(({ id }) => id === editItemId);
    const editItem = list[editItemIndex];
    const nextList = [
      ...list.slice(0, editItemIndex),
      {
        id:
          editItem.id === 'new'
            ? Math.random().toString(16).substr(2)
            : editItem.id,
        content: {
          include: stagedOperationText === 'Include',
          key: stagedTypeText,
          value: stagedProbeText,
        },
      },
      ...list.slice(editItemIndex + 1),
    ];
    setList(nextList);
    setEditItemId(null);
  }, [editItemId, stagedOperationText, stagedTypeText, stagedProbeText, list]);

  const onAddRule = useCallback(() => {
    const operationText = 'Include';
    const typeText = 'main';
    const valueText = '';
    setStagedOperationText(operationText);
    setStagedTypeText(typeText);
    setStagedProbeText(valueText);
    const nextList = [
      {
        id: 'new',
        content: {
          include: false,
          key: '',
          value: '',
        },
      },
      ...list,
    ];
    setList(nextList);
    setEditItemId('new');
  }, [list]);
  return (
    <RuntimeAttachmentStateless
      isEnabled={isEnabled}
      onToggleEnable={onToggleEnable}
      list={list}
      setList={setList}
      onDelete={onDelete}
      editItemId={editItemId}
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
    />
  );
}
