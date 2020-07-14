/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import {
  ConfigurationForm,
  DocumentFields,
  TemplatesForm,
  MultipleMappingsWarning,
} from './components';
import { IndexSettings } from './types';
import { extractMappingsDefinition } from './lib';
import { State } from './reducer';
import { MappingsState, Props as MappingsStateProps, Types } from './mappings_state';
import { IndexSettingsProvider } from './index_settings_context';

interface Props {
  onChange: MappingsStateProps['onChange'];
  value?: { [key: string]: any };
  indexSettings?: IndexSettings;
}

type TabName = 'fields' | 'advanced' | 'templates';

export const MappingsEditor = React.memo(({ onChange, value, indexSettings }: Props) => {
  const [selectedTab, selectTab] = useState<TabName>('fields');

  const { parsedDefaultValue, multipleMappingsDeclared } = useMemo(() => {
    const mappingsDefinition = extractMappingsDefinition(value);

    if (mappingsDefinition === null) {
      return { multipleMappingsDeclared: true };
    }

    const {
      _source,
      _meta,
      _routing,
      dynamic,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
      properties,
      dynamic_templates,
    } = mappingsDefinition;

    const parsed = {
      configuration: {
        _source,
        _meta,
        _routing,
        dynamic,
        numeric_detection,
        date_detection,
        dynamic_date_formats,
      },
      fields: properties,
      templates: {
        dynamic_templates,
      },
    };

    return { parsedDefaultValue: parsed, multipleMappingsDeclared: false };
  }, [value]);

  useEffect(() => {
    if (multipleMappingsDeclared) {
      // We set the data getter here as the user won't be able to make any changes
      onChange({
        getData: () => value! as Types['Mappings'],
        validate: () => Promise.resolve(true),
        isValid: true,
      });
    }
  }, [multipleMappingsDeclared, onChange, value]);

  const changeTab = async (tab: TabName, state: State) => {
    if (selectedTab === 'advanced') {
      // When we navigate away we need to submit the form to validate if there are any errors.
      const { isValid: isConfigurationFormValid } = await state.configuration.submitForm!();

      if (!isConfigurationFormValid) {
        /**
         * Don't navigate away from the tab if there are errors in the form.
         */
        return;
      }
    } else if (selectedTab === 'templates') {
      const { isValid: isTemplatesFormValid } = await state.templates.submitForm!();

      if (!isTemplatesFormValid) {
        return;
      }
    }

    selectTab(tab);
  };

  return (
    <div data-test-subj="mappingsEditor">
      {multipleMappingsDeclared ? (
        <MultipleMappingsWarning />
      ) : (
        <IndexSettingsProvider indexSettings={indexSettings}>
          <MappingsState onChange={onChange} value={parsedDefaultValue!}>
            {({ state }) => {
              const tabToContentMap = {
                fields: <DocumentFields />,
                templates: <TemplatesForm value={state.templates.defaultValue} />,
                advanced: <ConfigurationForm value={state.configuration.defaultValue} />,
              };

              return (
                <div className="mappingsEditor">
                  <EuiTabs>
                    <EuiTab
                      onClick={() => changeTab('fields', state)}
                      isSelected={selectedTab === 'fields'}
                      data-test-subj="formTab"
                    >
                      {i18n.translate('xpack.idxMgmt.mappingsEditor.fieldsTabLabel', {
                        defaultMessage: 'Mapped fields',
                      })}
                    </EuiTab>
                    <EuiTab
                      onClick={() => changeTab('templates', state)}
                      isSelected={selectedTab === 'templates'}
                      data-test-subj="formTab"
                    >
                      {i18n.translate('xpack.idxMgmt.mappingsEditor.templatesTabLabel', {
                        defaultMessage: 'Dynamic templates',
                      })}
                    </EuiTab>
                    <EuiTab
                      onClick={() => changeTab('advanced', state)}
                      isSelected={selectedTab === 'advanced'}
                      data-test-subj="formTab"
                    >
                      {i18n.translate('xpack.idxMgmt.mappingsEditor.advancedTabLabel', {
                        defaultMessage: 'Advanced options',
                      })}
                    </EuiTab>
                  </EuiTabs>

                  <EuiSpacer size="l" />

                  {tabToContentMap[selectedTab]}
                </div>
              );
            }}
          </MappingsState>
        </IndexSettingsProvider>
      )}
    </div>
  );
});
