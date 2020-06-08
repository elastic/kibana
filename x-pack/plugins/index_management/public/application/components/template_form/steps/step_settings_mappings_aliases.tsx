/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  // EuiFormRow,
  EuiText,
  // EuiCodeEditor,
  // EuiCode,
  EuiSwitch,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
// import { documentationService } from '../../../services/documentation';
import { ComponentTemplatesContainer, ComponentTemplates } from '../../../components';
import { TemplateDeserialized } from '../../../../../common';
import { ConfigureSection, SimulateTemplate } from '../components';
import { StepProps, DataGetterFunc } from '../types';
import { StepSettings } from './step_settings';
import { StepMappings } from './step_mappings';
// import { useJsonStep } from './use_json_step';

const hasEntries = (obj?: Record<string, any>) =>
  obj === undefined ? false : Object.keys(obj).length > 0;

export const StepSettingsMappingsAliases: React.FunctionComponent<StepProps> = ({
  indexTemplate,
  setDataGetter,
  onStepValidityChange,
}) => {
  const defaultTemplate = useMemo<TemplateDeserialized>(() => {
    return {
      composedOf: [],
      template: {
        settings: {},
        mappings: {},
        aliases: {},
      },
      ...indexTemplate,
    } as TemplateDeserialized;
  }, [indexTemplate]);

  const [isCreateComponentFromTemplateVisible, setIsCreateComponentFromTemplateVisible] = useState(
    false
  );
  const [isSettingsVisible, setIsSettingsVisible] = useState(
    hasEntries((defaultTemplate.template as any).settings)
  );
  const [isMappingsVisible, setIsMappingsVisible] = useState(
    hasEntries((defaultTemplate.template as any).mappings)
  );
  const [isAliasesVisible, setIsAliasesVisible] = useState(
    hasEntries((defaultTemplate.template as any).aliases)
  );
  const [isSimulateVisible, setIsSimulateVisible] = useState(false);

  const validation = useRef<{
    settings: boolean | undefined;
    mappings: boolean | undefined;
    aliases: boolean | undefined;
  }>({
    settings: undefined,
    mappings: undefined,
    aliases: undefined,
  });

  const dataGetter = useRef<any>(async () => ({
    isValid: true,
    data: {
      template: {
        settings: defaultTemplate.template.settings,
        mappings: defaultTemplate.template.mappings,
        aliases: defaultTemplate.template.aliases,
      },
    },
  }));

  const allGetters = useRef({
    settings: async () => ({ isValid: true, data: defaultTemplate.template.settings }),
    mappings: async () => ({ isValid: true, data: defaultTemplate.template.mappings }),
    aliases: async () => ({ isValid: true, data: defaultTemplate.template.aliases }),
  });

  const updateDataGetter = useCallback(() => {
    dataGetter.current = async () => {
      const { isValid: isSettingsValid, data: settingsData } = await allGetters.current.settings();
      const { isValid: isMappingsValid, data: mappingsData } = await allGetters.current.mappings();
      const { isValid: isAliasesValid, data: aliasesData } = await allGetters.current.aliases();

      return {
        isValid: Boolean(isSettingsValid) && Boolean(isMappingsValid) && Boolean(isAliasesValid),
        data: {
          template: {
            ...settingsData,
            ...mappingsData,
            ...aliasesData,
          },
        },
      };
    };

    setDataGetter(dataGetter.current);
  }, [setDataGetter]);

  const onCustomSettingsChange = useMemo(() => {
    return {
      settings: (stepDataGetter: DataGetterFunc) => {
        allGetters.current.settings = stepDataGetter;
        updateDataGetter();
      },
      mappings: (stepDataGetter: DataGetterFunc) => {
        allGetters.current.mappings = stepDataGetter;
        updateDataGetter();
      },
      aliases: (stepDataGetter: DataGetterFunc) => {
        allGetters.current.aliases = stepDataGetter;
        updateDataGetter();
      },
    };
  }, [updateDataGetter]);

  const getTemplateSimulate = useCallback(async () => {
    const { data } = await dataGetter.current();
    const { name, _kbnMeta, ...rest } = defaultTemplate;
    return {
      ...rest,
      ...data,
    };
  }, [defaultTemplate]);

  const onSettingsValidityChange = useCallback((isValid: boolean | undefined) => {
    validation.current = {
      ...validation.current,
      settings: isValid,
    };
  }, []);

  const onMappingsValidityChange = useCallback((isValid: boolean | undefined) => {
    validation.current = {
      ...validation.current,
      mappings: isValid,
    };
  }, []);

  useEffect(() => {
    setDataGetter(async () => ({
      isValid: true,
      data: defaultTemplate,
    }));
  }, [defaultTemplate, setDataGetter]);

  return (
    <>
      {/* Header */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 data-test-subj="stepTitle">
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepSettings.stepTitle"
                defaultMessage="Configure"
              />
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText size="xs">
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepSettings.settingsDescription"
                defaultMessage="Configure the mappings, settings and aliases of your index template."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
          <EuiButton size="s" onClick={() => setIsSimulateVisible(true)}>
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepSettings.docsButtonLabel"
              defaultMessage="Preview index template"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      {/* Inherit from components */}
      <ConfigureSection
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
            defaultMessage="Inherit from components"
          />
        }
        subTitle={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
            defaultMessage="Inherit index settings, mappings and aliases from component templates."
          />
        }
      >
        <EuiFlexGroup style={{ minHeight: '160px', maxHeight: '320px', height: '320px' }}>
          <EuiFlexItem
            style={{
              padding: '16px',
              backgroundColor: '#fafbfc',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#69707D',
              overflowY: 'auto',
            }}
          >
            <div>No component template selected.</div>
          </EuiFlexItem>

          <EuiFlexItem style={{ overflowY: 'auto' }}>
            <ComponentTemplatesContainer>
              {({ isLoading, components }) => {
                return (
                  <ComponentTemplates
                    isLoading={isLoading}
                    components={components ?? []}
                    emptyPrompt={{
                      showCreateButton: false,
                    }}
                    list={{
                      actions: [
                        {
                          label: 'Select',
                          handler: (component) => {
                            // console.log(component);
                          },
                        },
                      ],
                    }}
                  />
                );
              }}
            </ComponentTemplatesContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ConfigureSection>

      <EuiSpacer size="l" />

      {/* Inherit from index templates */}
      <ConfigureSection
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
            defaultMessage="Inherit from index templates"
          />
        }
        subTitle={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
            defaultMessage="Inherit index settings, mappings and aliases from index templates."
          />
        }
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiSwitch
              label="Create component from index template"
              id="toggle-inherit-index-templates"
              checked={isCreateComponentFromTemplateVisible}
              onChange={(e) => {
                setIsCreateComponentFromTemplateVisible(e.target.checked);
              }}
            />
            <EuiSpacer size="s" />
            <EuiTextColor color="subdued">
              <EuiText size="s">
                <p>
                  Composable templates do not support anymore inheritance from other index templates
                  like the legacy index templates did. If you want to inherit settings from other
                  index template you need to first create a component template.
                </p>
              </EuiText>
            </EuiTextColor>
          </EuiFlexItem>
          <EuiFlexItem>{isCreateComponentFromTemplateVisible && <div>TODO</div>}</EuiFlexItem>
        </EuiFlexGroup>
      </ConfigureSection>

      <EuiSpacer size="l" />

      <ConfigureSection
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
            defaultMessage="Additional settings"
          />
        }
        subTitle={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
            defaultMessage="Add additional index settings, mappings or aliases. This configuration will have priority over the component templates"
          />
        }
      >
        <>
          {/* Index settings */}
          <div>
            <EuiSwitch
              label="Index settings"
              id="toggle-use-components"
              checked={isSettingsVisible}
              onChange={(e) => {
                setIsSettingsVisible(e.target.checked);
              }}
            />
            {isSettingsVisible && (
              <div>
                <EuiSpacer />
                <StepSettings
                  indexTemplate={defaultTemplate}
                  setDataGetter={onCustomSettingsChange.settings}
                  onStepValidityChange={onSettingsValidityChange}
                />
                <EuiSpacer size="xl" />
              </div>
            )}
          </div>

          <EuiSpacer size="l" />

          {/* Mappings */}
          <div>
            <EuiSwitch
              label="Mappings"
              id="toggle-use-components"
              checked={isMappingsVisible}
              onChange={(e) => {
                setIsMappingsVisible(e.target.checked);
              }}
            />
            {isMappingsVisible && (
              <div>
                <EuiSpacer />
                <StepMappings
                  indexTemplate={defaultTemplate}
                  setDataGetter={onCustomSettingsChange.mappings}
                  onStepValidityChange={onMappingsValidityChange}
                />
              </div>
            )}
          </div>

          <EuiSpacer size="l" />

          {/* Aliases */}
          <div>
            <EuiSwitch
              label="Aliases"
              id="toggle-use-components"
              checked={isAliasesVisible}
              onChange={(e) => {
                setIsAliasesVisible(e.target.checked);
              }}
            />
            {isAliasesVisible && (
              <div>
                <EuiSpacer />
                Aliases configuration
              </div>
            )}
          </div>
        </>
      </ConfigureSection>

      {/* Simulate index template */}
      {isSimulateVisible && (
        <SimulateTemplate
          getTemplate={getTemplateSimulate}
          onClose={() => setIsSimulateVisible(false)}
        />
      )}
    </>
  );
};
