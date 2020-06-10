/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';

import { DataGetterFunc } from '../template_form/types';
import { ComponentTemplates } from './component_templates';
import { ComponentTemplatesList } from './component_templates_list';
import { ComponentTemplateDeserialized } from './types';
import { useApi } from './component_templates_context';

import './component_templates_selector.scss';

interface ComponentsSelected {
  [name: string]: ComponentTemplateDeserialized;
}

interface Props {
  onChange: (dataGetter: DataGetterFunc<string[]>) => void;
  defaultValue: string[];
}

export const ComponentTemplatesSelector = ({ onChange, defaultValue }: Props) => {
  const { data: components, isLoading } = useApi().useComponentTemplates();

  const [componentsSelected, setComponentsSelected] = useState<ComponentsSelected>({});
  const hasSelection = Object.keys(componentsSelected).length > 0;

  useEffect(() => {
    onChange(async () => ({ data: Object.keys(componentsSelected), isValid: true }));
  }, [componentsSelected, onChange]);

  useEffect(() => {
    if (components) {
      setComponentsSelected(
        components.reduce((acc, component) => {
          if (defaultValue.includes(component.name)) {
            acc[component.name] = component;
          }
          return acc;
        }, {} as ComponentsSelected)
      );
    }
  }, [components, defaultValue]);

  return (
    <EuiFlexGroup className="componentTemplatesSelector">
      <EuiFlexItem
        className={classNames('componentTemplatesSelector__selection', {
          'componentTemplatesSelector__selection--is-empty': !hasSelection,
        })}
      >
        {hasSelection ? (
          <ComponentTemplatesList
            components={Object.values(componentsSelected)}
            listItemProps={{
              actions: [
                {
                  label: 'View',
                  handler: (component) => {
                    // console.log(component);
                  },
                },
                {
                  label: 'Remove',
                  handler: (component) => {
                    setComponentsSelected((prev) => {
                      const nextState = { ...prev };
                      delete nextState[component.name];
                      return nextState;
                    });
                  },
                },
              ],
            }}
          />
        ) : (
          <div> No component template selected.</div>
        )}
      </EuiFlexItem>

      <EuiFlexItem style={{ overflowY: 'auto' }}>
        <ComponentTemplates
          isLoading={isLoading}
          components={components ?? []}
          emptyPrompt={{
            showCreateButton: false,
          }}
          listItemProps={{
            actions: [
              {
                label: 'View',
                handler: (component) => {
                  // console.log(component);
                },
              },
              {
                label: 'Select',
                handler: (component) => {
                  setComponentsSelected((prev) => {
                    const nextState = { ...prev };
                    nextState[component.name] = component;
                    return nextState;
                  });
                },
              },
            ],
            isSelected: (component: ComponentTemplateDeserialized) => {
              return componentsSelected.hasOwnProperty(component.name);
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
