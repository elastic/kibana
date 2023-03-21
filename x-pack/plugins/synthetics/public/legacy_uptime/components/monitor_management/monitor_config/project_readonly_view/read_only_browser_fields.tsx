/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiFormRow, EuiFieldText, EuiSpacer, EuiCode } from '@elastic/eui';
import { OptionalLabel } from '../../../fleet_package/optional_label';
import { ProjectReadonlyCommonFields } from './readonly_common_fields';
import { ConfigKey, MonacoEditorLangId } from '../../../../../../common/runtime_types';
import {
  useBrowserAdvancedFieldsContext,
  useBrowserSimpleFieldsContext,
} from '../../../fleet_package/contexts';
import { ThrottlingFields } from '../../../fleet_package/browser/throttling_fields';
import { DescribedFormGroupWithWrap } from '../../../fleet_package/common/described_form_group_with_wrap';
import { CodeEditor } from '../../../fleet_package/code_editor';

const noop = () => {};

export const ProjectBrowserReadonlyFields = ({ minColumnWidth }: { minColumnWidth: string }) => {
  const { fields: advancedFields } = useBrowserAdvancedFieldsContext();
  const { fields } = useBrowserSimpleFieldsContext();

  const paramsField = (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.params.label"
          defaultMessage="Parameters"
        />
      }
      labelAppend={<OptionalLabel />}
      helpText={
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.params.helpText"
          defaultMessage="Use JSON to define parameters that can be referenced in your script with {code}"
          values={{ code: <EuiCode>params.value</EuiCode> }}
        />
      }
    >
      <CodeEditor
        ariaLabel={i18n.translate(
          'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.json.ariaLabel',
          {
            defaultMessage: 'JSON code editor',
          }
        )}
        id="jsonParamsEditor"
        languageId={MonacoEditorLangId.JSON}
        value={fields[ConfigKey.PARAMS]}
        readOnly={true}
        data-test-subj="syntheticsBrowserParams"
      />
    </EuiFormRow>
  );

  return (
    <>
      <EuiSpacer />
      <ProjectReadonlyCommonFields
        extraFields={paramsField}
        minColumnWidth={minColumnWidth}
        fields={fields}
      />
      <EuiSpacer />
      <EuiAccordion
        id="syntheticsIntegrationBrowserAdvancedOptions"
        buttonContent="Advanced Browser options"
        data-test-subj="syntheticsBrowserAdvancedFieldsAccordion"
      >
        <EuiSpacer size="m" />
        <DescribedFormGroupWithWrap
          title={
            <h4>
              <FormattedMessage
                id="xpack.synthetics.browser.project.browserAdvancedSettings.title"
                defaultMessage="Synthetics agent options"
              />
            </h4>
          }
          description={
            <FormattedMessage
              id="xpack.synthetics.browser.project.browserAdvancedSettings.description"
              defaultMessage="Provide fine-tuned configuration for the synthetics agent."
            />
          }
          minColumnWidth={minColumnWidth}
        >
          <EuiSpacer size="s" />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.synthetics.browser.project.browserAdvancedSettings.screenshots.label"
                defaultMessage="Screenshot options"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.synthetics.browser.project.browserAdvancedSettings.screenshots.helpText"
                defaultMessage="Set this option to manage the screenshots captured by the synthetics agent."
              />
            }
          >
            <EuiFieldText
              value={advancedFields[ConfigKey.SCREENSHOTS]}
              onChange={noop}
              data-test-subj="syntheticsBrowserScreenshots"
              readOnly={true}
            />
          </EuiFormRow>
        </DescribedFormGroupWithWrap>

        <ThrottlingFields minColumnWidth={minColumnWidth} readOnly={true} />
      </EuiAccordion>
    </>
  );
};
