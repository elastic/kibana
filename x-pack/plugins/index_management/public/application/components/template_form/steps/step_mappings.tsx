/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  // EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { documentationService } from '../../../services/documentation';
import { StepProps, DataGetterFunc } from '../types';
import { MappingsEditor, OnUpdateHandler, LoadMappingsFromJsonButton } from '../../mappings_editor';

export const StepMappings: React.FunctionComponent<StepProps> = ({
  indexTemplate,
  setDataGetter,
  onStepValidityChange,
}) => {
  const [mappings, setMappings] = useState(indexTemplate?.template.mappings);

  const onMappingsEditorUpdate = useCallback<OnUpdateHandler>(
    ({ isValid, getData, validate }) => {
      onStepValidityChange(isValid);

      const dataGetterFunc: DataGetterFunc = async () => {
        const isMappingsValid = isValid === undefined ? await validate() : isValid;
        const data = getData(isMappingsValid);
        return {
          isValid: isMappingsValid,
          data: { mappings: data },
          path: 'template',
        };
      };

      setDataGetter(dataGetterFunc);
    },
    [setDataGetter, onStepValidityChange]
  );

  const onJsonLoaded = (json: { [key: string]: any }): void => {
    setMappings(json);
  };

  return (
    <div data-test-subj="stepMappings">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepMappings.mappingsDescription"
                defaultMessage="Define how to store and index documents."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <LoadMappingsFromJsonButton onJson={onJsonLoaded} />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                flush="right"
                href={documentationService.getMappingDocumentationLink()}
                target="_blank"
                iconType="help"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepMappings.docsButtonLabel"
                  defaultMessage="Mapping docs"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {/* Mappings code editor */}
      <MappingsEditor
        value={mappings}
        onChange={onMappingsEditorUpdate}
        indexSettings={indexTemplate?.template.settings}
      />

      <EuiSpacer size="m" />
    </div>
  );
};
