/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { documentationService } from '../../../services/documentation';
import { ComponentTemplatesContainer, ComponentTemplates } from '../../../components';
import { ConfigureSection, SimulateTemplate } from '../components';
import { StepSettings } from './step_settings';
import { StepProps, DataGetterFunc } from '../types';
// import { useJsonStep } from './use_json_step';

export const StepSettingsMappingsAliases: React.FunctionComponent<StepProps> = ({
  template = {},
  setDataGetter,
  onStepValidityChange,
}) => {
  const { name, _kbnMeta, ...rest } = template;
  const [isCreateComponentFromTemplateVisible, setIsCreateComponentFromTemplateVisible] = useState(
    false
  );
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMappingsVisible, setIsMappingsVisible] = useState(false);
  const [isAliasesVisible, setIsAliasesVisible] = useState(false);
  const [isSimulateVisible, setIsSimulateVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState({
    ...rest,
    composedOf: [],
    template: {},
  });

  const cacheTemplate = useRef(template);

  const validation = useRef<{
    settings: boolean | undefined;
    mappings: boolean | undefined;
    aliases: boolean | undefined;
  }>({
    settings: true,
    mappings: true,
    aliases: true,
  });

  const setSettingsDataGetter = useCallback(async (stepDataGetter: DataGetterFunc) => {
    const allSectionsValid = Object.values(validation.current).every((isValid) => isValid);

    if (allSectionsValid) {
      const { data } = await stepDataGetter();
      let nextState;
      setCurrentTemplate((prev) => {
        nextState = {
          ...prev,
          template: {
            ...prev.template,
            ...data,
          },
        };
        return nextState;
      });

      cacheTemplate.current = nextState as any;
    }
  }, []);

  const onSettingsValidityChange = useCallback((isValid: boolean | undefined) => {
    validation.current = {
      ...validation.current,
      settings: isValid,
    };
  }, []);

  useEffect(() => {
    setDataGetter(async () => ({
      isValid: true,
      data: currentTemplate,
    }));
  }, [currentTemplate, setDataGetter]);

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
                  template={cacheTemplate.current as any}
                  setDataGetter={setSettingsDataGetter}
                  onStepValidityChange={onSettingsValidityChange}
                />
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
                Mappings configuration
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
        <SimulateTemplate template={currentTemplate} onClose={() => setIsSimulateVisible(false)} />
      )}
    </>
  );
};
