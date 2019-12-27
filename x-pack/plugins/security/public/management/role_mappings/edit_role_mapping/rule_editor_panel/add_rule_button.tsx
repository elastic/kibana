/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Rule, FieldRule, AllRule } from '../../../model';

interface Props {
  onClick: (newRule: Rule) => void;
}

export const AddRuleButton = (props: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const button = (
    <EuiButtonEmpty
      iconType="plusInCircle"
      data-test-subj="roleMappingsAddRuleButton"
      onClick={() => {
        setIsMenuOpen(!isMenuOpen);
      }}
    >
      <FormattedMessage
        id="xpack.security.management.editRoleMapping.addRuleButton"
        defaultMessage="Add"
      />
    </EuiButtonEmpty>
  );

  const options = [
    <EuiContextMenuItem
      id="addRuleOption"
      key="rule"
      name="Add rule"
      icon="user"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(new FieldRule('username', '*'));
      }}
    >
      <FormattedMessage
        id="xpack.security.management.editRoleMapping.addRuleOption"
        defaultMessage="Add rule"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      id="addRuleGroupOption"
      key="ruleGroup"
      name="Add rule group"
      icon="list"
      onClick={() => {
        setIsMenuOpen(false);
        props.onClick(new AllRule([new FieldRule('username', '*')]));
      }}
    >
      <FormattedMessage
        id="xpack.security.management.editRoleMapping.addRuleGroupOption"
        defaultMessage="Add rule group"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="addRuleContextMenu"
      data-test-subj="addRuleContextMenu"
      button={button}
      isOpen={isMenuOpen}
      closePopover={() => setIsMenuOpen(false)}
      panelPaddingSize="none"
      withTitle
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel title="Add rule" items={options} />
    </EuiPopover>
  );
};
