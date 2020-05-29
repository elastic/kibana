/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
// import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
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
import { ComponentTemplatesContainer } from '../../../components';
import { StepProps } from '../types';
// import { useJsonStep } from './use_json_step';

// const IndexSettings = ({ defaultValue, setDataGetter, onStepValidityChange }: any) => {
//   const { content, setContent, error } = useJsonStep({
//     prop: 'settings',
//     defaultValue,
//     setDataGetter,
//     onStepValidityChange,
//   });

//   return (
//     <div data-test-subj="stepSettings">
//       <EuiFlexGroup justifyContent="spaceBetween">
//         <EuiFlexItem grow={false}>
//           <EuiTitle>
//             <h2 data-test-subj="stepTitle">
//               <FormattedMessage
//                 id="xpack.idxMgmt.templateForm.stepSettings.stepTitle"
//                 defaultMessage="Index settings / Mappings / Aliases"
//               />
//             </h2>
//           </EuiTitle>

//           <EuiSpacer size="s" />

//           <EuiText size="xs">
//             <p>
//               <FormattedMessage
//                 id="xpack.idxMgmt.templateForm.stepSettings.settingsDescription"
//                 defaultMessage="Configure your index template."
//               />
//             </p>
//           </EuiText>
//         </EuiFlexItem>

//         <EuiFlexItem grow={false}>
//           <EuiButtonEmpty
//             size="s"
//             flush="right"
//             href={documentationService.getSettingsDocumentationLink()}
//             target="_blank"
//             iconType="help"
//           >
//             <FormattedMessage
//               id="xpack.idxMgmt.templateForm.stepSettings.docsButtonLabel"
//               defaultMessage="Preview index template"
//             />
//           </EuiButtonEmpty>
//         </EuiFlexItem>
//       </EuiFlexGroup>

//       <EuiSpacer size="l" />

//       {/* Settings code editor */}
//       <EuiFormRow
//         label={
//           <FormattedMessage
//             id="xpack.idxMgmt.templateForm.stepSettings.fieldIndexSettingsLabel"
//             defaultMessage="Index settings"
//           />
//         }
//         helpText={
//           <FormattedMessage
//             id="xpack.idxMgmt.templateForm.stepSettings.settingsEditorHelpText"
//             defaultMessage="Use JSON format: {code}"
//             values={{
//               code: <EuiCode>{JSON.stringify({ number_of_replicas: 1 })}</EuiCode>,
//             }}
//           />
//         }
//         isInvalid={Boolean(error)}
//         error={error}
//         fullWidth
//       >
//         <EuiCodeEditor
//           mode="json"
//           theme="textmate"
//           width="100%"
//           height="500px"
//           setOptions={{
//             showLineNumbers: false,
//             tabSize: 2,
//           }}
//           editorProps={{
//             $blockScrolling: Infinity,
//           }}
//           showGutter={false}
//           minLines={6}
//           aria-label={i18n.translate(
//             'xpack.idxMgmt.templateForm.stepSettings.fieldIndexSettingsAriaLabel',
//             {
//               defaultMessage: 'Index settings editor',
//             }
//           )}
//           value={content}
//           onChange={(updated: string) => setContent(updated)}
//           data-test-subj="settingsEditor"
//         />
//       </EuiFormRow>
//     </div>
//   );
// };

export const StepSettingsMappingsAliases: React.FunctionComponent<StepProps> = ({
  template,
  setDataGetter,
  onStepValidityChange,
}) => {
  const [isFromComponentsVisible] = useState(true);
  const [isAddManualVisible] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isMappingsVisible, setIsMappingsVisible] = useState(false);
  const [isAliasesVisible, setIsAliasesVisible] = useState(false);

  useEffect(() => {
    setDataGetter(async () => ({
      isValid: true,
      data: {
        todo: true,
      },
    }));
  }, [setDataGetter]);

  return (
    <>
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

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationService.getSettingsDocumentationLink()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepSettings.docsButtonLabel"
              defaultMessage="Preview index template"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      {/* Inherit from components */}
      <div>
        <EuiFlexGroup>
          {/* <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="enablePhaseSwitch-warm"
              label=""
              id="toggle-use-components"
              checked={isFromComponentsVisible}
              onChange={(e) => {
                setIsFromComponentsVisible(e.target.checked);
              }}
              aria-controls="warmPhaseContent"
            />
          </EuiFlexItem> */}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
                  defaultMessage="Inherit from components"
                />
              </h2>
            </EuiTitle>
            <EuiTextColor color="subdued">
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
                    defaultMessage="Inherit index settings, mappings and aliases from your components."
                  />
                </p>
              </EuiText>
            </EuiTextColor>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isFromComponentsVisible ? (
          <>
            <EuiSpacer />
            <EuiFlexGroup style={{ minHeight: '160px', maxHeight: '320px' }}>
              <EuiFlexItem
                style={{
                  padding: '16px',
                  backgroundColor: '#fafbfc',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#69707D',
                }}
              >
                <div>Select a component template</div>
              </EuiFlexItem>
              <EuiFlexItem style={{ overflowY: 'auto' }}>
                <ComponentTemplatesContainer />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : null}
      </div>

      <EuiSpacer size="l" />

      <div>
        <EuiFlexGroup>
          {/* <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="enablePhaseSwitch-warm"
              label=""
              id="toggle-manual-add"
              checked={isAddManualVisible}
              onChange={(e) => {
                setIsAddManualVisible(e.target.checked);
              }}
            />
          </EuiFlexItem> */}
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
                  defaultMessage="Additional configuration"
                />
              </h2>
            </EuiTitle>
            <EuiTextColor color="subdued">
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
                    defaultMessage="Add additional index settings, mappings or aliases. This additional configuration will have priority over the component templates"
                  />
                </p>
              </EuiText>
            </EuiTextColor>

            <EuiSpacer />

            {isAddManualVisible ? (
              <>
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
                      Index settings configuration
                    </div>
                  )}
                </div>
                <EuiSpacer size="l" />
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
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
