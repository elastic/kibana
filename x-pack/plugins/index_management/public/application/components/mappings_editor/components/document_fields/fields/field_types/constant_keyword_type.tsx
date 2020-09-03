/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { documentationService } from '../../../../../../services/documentation';
import { UseField, Field, JsonEditorField } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import { NormalizedField } from '../../../../types';
import { AdvancedParametersSection, EditFieldFormRow, BasicParametersSection } from '../edit_field';

interface Props {
  field: NormalizedField;
}

export const ConstantKeywordType: FunctionComponent<Props> = ({ field }) => {
  return (
    <>
      <BasicParametersSection>
        {/* Value field */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.constantKeyword.valueFieldTitle', {
            defaultMessage: 'Set value',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.constantKeyword.valueFieldDescription',
            {
              defaultMessage:
                'The value of this field for all documents in the index. If not specified, defaults to the value specified in the first document indexed.',
            }
          )}
          defaultToggleValue={field.source?.value !== undefined}
        >
          <UseField path="value" config={getFieldConfig('value')} component={Field} />
        </EditFieldFormRow>
      </BasicParametersSection>

      <AdvancedParametersSection>
        {/* Meta field */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.constantKeyword.metaFieldTitle', {
            defaultMessage: 'Set metadata',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.constantKeyword.metaFieldDescription',
            {
              defaultMessage:
                'Arbitrary information about the field. Specify as JSON key-value pairs.',
            }
          )}
          defaultToggleValue={field.source?.meta !== undefined}
          docLink={{
            text: i18n.translate('xpack.idxMgmt.mappingsEditor.constantKeyword.metaDocLinkText', {
              defaultMessage: 'Metadata documentation',
            }),
            href: documentationService.getMetaLink(),
          }}
        >
          <UseField
            path="meta"
            config={getFieldConfig('meta')}
            component={JsonEditorField}
            componentProps={{
              euiCodeEditorProps: {
                height: '300px',
                'aria-label': i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.constantKeyword.metaFieldAriaLabel',
                  {
                    defaultMessage: 'metadata field data editor',
                  }
                ),
              },
            }}
          />
        </EditFieldFormRow>
      </AdvancedParametersSection>
    </>
  );
};
