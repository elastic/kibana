/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCheckbox,
  EuiButtonEmpty,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import classNames from 'classnames';

import { ComponentTemplateDeserialized } from '../../../../common';
import { TemplateContentIndicator } from '../template_content_indicator';

import './component_templates_list_item.scss';

const hasEntries = (obj?: Record<string, any>) =>
  obj === undefined ? false : Object.keys(obj).length > 0;

export interface Props {
  component: ComponentTemplateDeserialized;
  isSelectable?: boolean;
  isDragable?: boolean;
  isSelected?: boolean | ((component: ComponentTemplateDeserialized) => boolean);
  actions?: Array<{ label: string; handler: (component: ComponentTemplateDeserialized) => void }>;
}

export const ComponentTemplatesListItem = ({
  component,
  actions,
  isSelectable = false,
  isSelected = false,
}: Props) => {
  const [checked, setChecked] = useState(false);
  const hasActions = actions && actions.length > 0;
  const isSelectedValue = typeof isSelected === 'function' ? isSelected(component) : isSelected;

  return (
    <div
      className={classNames('componentTemplatesListItem', {
        'componentTemplatesListItem--selected': isSelectedValue,
      })}
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            {isSelectable && (
              <EuiFlexItem>
                <EuiCheckbox
                  id={component.name}
                  checked={checked}
                  onChange={() => setChecked((prev) => !prev)}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText>{component.name}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ flexDirection: 'row' }}>
              <TemplateContentIndicator
                settings={hasEntries(component.template.settings)}
                mappings={hasEntries(component.template.mappings)}
                aliases={hasEntries(component.template.aliases)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Actions */}
        {hasActions && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              {actions!.map((action, i) => (
                <EuiFlexItem key={i}>
                  <EuiButtonEmpty
                    onClick={() => action.handler(component)}
                    data-test-subj="addPropertyButton"
                    aria-label={action.label}
                  >
                    {action.label}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Check icon when selected */}
      {isSelectedValue && (
        <EuiIcon className="componentTemplatesListItem__checkIcon" type="check" color="secondary" />
      )}
    </div>
  );
};
