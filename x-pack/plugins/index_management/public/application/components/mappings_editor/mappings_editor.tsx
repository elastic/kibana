/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import { ILicense } from '@kbn/licensing-plugin/common/types';
import { useAppContext } from '../../app_context';
import { IndexMode } from '../../../../common/types/data_streams';
import {
  DocumentFields,
  RuntimeFieldsList,
  TemplatesForm,
  ConfigurationForm,
  MultipleMappingsWarning,
} from './components';
import {
  OnUpdateHandler,
  IndexSettings,
  Field,
  Mappings,
  MappingsConfiguration,
  MappingsTemplates,
  RuntimeFields,
} from './types';
import { useDispatch, useMappingsState } from './mappings_state_context';
import { useMappingsStateListener } from './use_state_listener';
import { useConfig } from './config_context';
import { DocLinksStart } from './shared_imports';
import { DocumentFieldsHeader } from './components/document_fields/document_fields_header';
import { SearchResult } from './components/document_fields/search_fields';
import { parseMappings } from '../../shared/parse_mappings';
import { LOGSDB_INDEX_MODE, TIME_SERIES_MODE } from '../../../../common/constants';

type TabName = 'fields' | 'runtimeFields' | 'advanced' | 'templates';

export interface MappingsEditorParsedMetadata {
  parsedDefaultValue?: {
    configuration: MappingsConfiguration;
    fields: { [key: string]: Field };
    templates: MappingsTemplates;
    runtime: RuntimeFields;
  };
  multipleMappingsDeclared: boolean;
}

export interface Props {
  onChange: OnUpdateHandler;
  value?: { [key: string]: any };
  indexSettings?: IndexSettings;
  docLinks: DocLinksStart;
  /** List of plugins installed in the cluster nodes */
  esNodesPlugins: string[];
  indexMode?: IndexMode;
}

export const MappingsEditor = React.memo(
  ({ onChange, value, docLinks, indexSettings, esNodesPlugins, indexMode }: Props) => {
    const {
      plugins: { licensing },
    } = useAppContext();
    const { parsedDefaultValue, multipleMappingsDeclared } = useMemo<MappingsEditorParsedMetadata>(
      () => parseMappings(value),
      [value]
    );
    /**
     * Hook that will listen to:
     * 1. "value" prop changes in order to reset the mappings editor
     * 2. "state" changes in order to communicate any updates to the consumer
     */
    useMappingsStateListener({ onChange, value: parsedDefaultValue });

    const { update: updateConfig } = useConfig();
    const state = useMappingsState();
    const [selectedTab, selectTab] = useState<TabName>('fields');

    useEffect(() => {
      if (multipleMappingsDeclared) {
        // We set the data getter here as the user won't be able to make any changes
        onChange({
          getData: () => value! as Mappings,
          validate: () => Promise.resolve(true),
          isValid: true,
        });
      }
    }, [multipleMappingsDeclared, onChange, value]);

    useEffect(() => {
      // Update the the config context so it is available globally (e.g in our Global flyout)
      updateConfig({
        docLinks,
        indexSettings: indexSettings ?? {},
      });
    }, [updateConfig, docLinks, indexSettings]);

    const changeTab = async (tab: TabName) => {
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

    const dispatch = useDispatch();
    const onSearchChange = useCallback(
      (searchValue: string) => {
        dispatch({ type: 'search:update', value: searchValue });
      },
      [dispatch]
    );

    const [isLicenseCheckComplete, setIsLicenseCheckComplete] = useState(false);
    useEffect(() => {
      const subscription = licensing?.license$.subscribe((license: ILicense) => {
        dispatch({
          type: 'hasEnterpriseLicense.update',
          value: license.isActive && license.hasAtLeast('enterprise'),
        });
        setIsLicenseCheckComplete(true);
      });

      return () => subscription?.unsubscribe();
    }, [dispatch, licensing]);

    useEffect(() => {
      if (
        isLicenseCheckComplete &&
        !state.configuration.defaultValue._source &&
        (indexMode === LOGSDB_INDEX_MODE || indexMode === TIME_SERIES_MODE)
      ) {
        if (state.hasEnterpriseLicense) {
          dispatch({
            type: 'configuration.save',
            value: { ...state.configuration.defaultValue, _source: { mode: 'synthetic' } } as any,
          });
        }
      }
    }, [
      indexMode,
      dispatch,
      state.configuration,
      state.hasEnterpriseLicense,
      isLicenseCheckComplete,
    ]);

    const tabToContentMap = {
      fields: (
        <DocumentFields
          searchComponent={
            <>
              <DocumentFieldsHeader
                searchValue={state.search.term}
                onSearchChange={onSearchChange}
              />
              <EuiSpacer size="m" />
            </>
          }
          searchResultComponent={
            state.search.term.trim() !== '' ? (
              <SearchResult
                result={state.search.result}
                documentFieldsState={state.documentFields}
              />
            ) : undefined
          }
        />
      ),
      runtimeFields: <RuntimeFieldsList />,
      templates: <TemplatesForm value={state.templates.defaultValue} />,
      advanced: (
        <ConfigurationForm
          value={state.configuration.defaultValue}
          esNodesPlugins={esNodesPlugins}
        />
      ),
    };

    return (
      <div data-test-subj="mappingsEditor">
        {multipleMappingsDeclared ? (
          <MultipleMappingsWarning />
        ) : (
          <div className="mappingsEditor">
            <EuiTabs>
              <EuiTab
                onClick={() => changeTab('fields')}
                isSelected={selectedTab === 'fields'}
                data-test-subj="formTab"
              >
                {i18n.translate('xpack.idxMgmt.mappingsEditor.fieldsTabLabel', {
                  defaultMessage: 'Mapped fields',
                })}
              </EuiTab>
              <EuiTab
                onClick={() => changeTab('runtimeFields')}
                isSelected={selectedTab === 'runtimeFields'}
                data-test-subj="formTab"
              >
                {i18n.translate('xpack.idxMgmt.mappingsEditor.runtimeFieldsTabLabel', {
                  defaultMessage: 'Runtime fields',
                })}
              </EuiTab>
              <EuiTab
                onClick={() => changeTab('templates')}
                isSelected={selectedTab === 'templates'}
                data-test-subj="formTab"
              >
                {i18n.translate('xpack.idxMgmt.mappingsEditor.templatesTabLabel', {
                  defaultMessage: 'Dynamic templates',
                })}
              </EuiTab>
              <EuiTab
                onClick={() => changeTab('advanced')}
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
        )}
      </div>
    );
  }
);
