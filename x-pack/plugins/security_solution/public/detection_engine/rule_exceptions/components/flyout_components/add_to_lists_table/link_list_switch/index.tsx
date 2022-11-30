/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexItem, EuiSwitch } from '@elastic/eui';
import type { ExceptionListRuleReferencesSchema } from '../../../../../../../common/detection_engine/rule_exceptions';

export const LinkListSwitch = memo(
  ({
    list,
    linkedList,
    onListLinkChange,
  }: {
    list: ExceptionListRuleReferencesSchema;
    linkedList: ExceptionListRuleReferencesSchema[];
    onListLinkChange?: (listSelectedToAdd: ExceptionListRuleReferencesSchema[]) => void;
  }) => {
    const isListLinked = useMemo(
      () => Boolean(linkedList.find((l) => l.id === list.id)),
      [linkedList, list.id]
    );
    const onLinkOrUnlinkList = useCallback(
      ({ target: { checked } }) => {
        const newLinkedLists = !checked
          ? linkedList?.filter((item) => item.id !== list.id)
          : [...linkedList, list];
        if (typeof onListLinkChange === 'function') onListLinkChange(newLinkedLists);
      },
      [linkedList, onListLinkChange, list]
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch onChange={onLinkOrUnlinkList} label="" checked={isListLinked} />
      </EuiFlexItem>
    );
  }
);

LinkListSwitch.displayName = 'LinkListSwitch';
