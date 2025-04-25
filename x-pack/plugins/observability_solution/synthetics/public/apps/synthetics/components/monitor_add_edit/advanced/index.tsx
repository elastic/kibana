/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescribedFormGroup, EuiPanel, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import styled from 'styled-components';
import { FORM_CONFIG } from '../form/form_config';
import { Field } from '../form/field';
import { ConfigKey, FormMonitorType } from '../types';

export const AdvancedConfig = ({ readOnly }: { readOnly: boolean }) => {
  const { watch } = useFormContext();
  const [type]: [FormMonitorType] = watch([ConfigKey.FORM_MONITOR_TYPE]);

  const formConfig = useMemo(() => {
    return FORM_CONFIG(readOnly)[type];
  }, [readOnly, type]);

  return formConfig?.advanced ? (
    <EuiPanel hasBorder>
      <EuiAccordion
        id="syntheticsAdvancedPanel"
        buttonContent={i18n.translate('xpack.synthetics.monitorConfig.advancedOptions.title', {
          defaultMessage: 'Advanced options',
        })}
      >
        <EuiSpacer />
        {formConfig.advanced?.map((configGroup) => {
          return (
            <DescribedFormGroup
              description={configGroup.description}
              title={<h3>{configGroup.title}</h3>}
              fullWidth
              key={configGroup.title}
              descriptionFlexItemProps={{ style: { minWidth: 208 } }}
              fieldFlexItemProps={{ style: { minWidth: 208 } }}
              style={{ flexWrap: 'wrap' }}
            >
              {configGroup.components.map((field) => {
                return <Field {...field} key={field.fieldKey} />;
              })}
            </DescribedFormGroup>
          );
        })}
      </EuiAccordion>
    </EuiPanel>
  ) : null;
};

const DescribedFormGroup = styled(EuiDescribedFormGroup)`
  > div.euiFlexGroup {
    flex-wrap: wrap;
  }
`;
