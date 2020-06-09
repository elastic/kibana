/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';

import { ComponentTemplates } from './component_templates';
import { ComponentTemplatesList } from './component_templates_list';
import { ComponentTemplateDeserialized } from './types';
import { useApi } from './component_templates_context';

import './component_templates_selector.scss';

interface Props {
  onChange: (dataGetter: () => { data: string[] }) => void;
  defaultValue: string[];
}

export const ComponentTemplatesSelector = ({ onChange, defaultValue }: Props) => {
  const { data: components, isLoading } = useApi().useComponentTemplates();

  const [componentsSelected, setComponentsSelected] = useState<ComponentTemplateDeserialized[]>([]);

  useEffect(() => {
    onChange(() => ({ data: componentsSelected.map(({ name }) => name) }));
  }, [componentsSelected, onChange]);

  useEffect(() => {
    if (components) {
      setComponentsSelected(components.filter(({ name }) => defaultValue.includes(name)));
    }
  }, [components, defaultValue]);

  return (
    <EuiFlexGroup className="componentTemplatesSelector">
      <EuiFlexItem
        className={classNames('componentTemplatesSelector__selection', {
          'componentTemplatesSelector__selection--is-empty': componentsSelected.length === 0,
        })}
      >
        {componentsSelected.length > 0 ? (
          <ComponentTemplatesList
            components={componentsSelected}
            actions={[
              {
                label: 'View',
                handler: (component) => {
                  // console.log(component);
                },
              },
              {
                label: 'Remove',
                handler: (component) => {
                  setComponentsSelected((prev) =>
                    prev.filter(({ name }) => name !== component.name)
                  );
                  // console.log(component);
                },
              },
            ]}
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
          listProps={{
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
                  setComponentsSelected((prev) => [...prev, component]);
                  // console.log(component);
                },
              },
            ],
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
