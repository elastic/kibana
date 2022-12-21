/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { TemplateDeserialized } from '../../../../../../../common';
import { SimulateTemplate } from '../../../../../components/index_templates';

interface Props {
  templateDetails: TemplateDeserialized;
}

export const TabPreview = ({ templateDetails }: Props) => {
  return (
    <div data-test-subj="previewTabContent">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.templateDetails.previewTab.descriptionText"
            defaultMessage="This is the final template that will be applied to matching indices."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <SimulateTemplate template={templateDetails} />
    </div>
  );
};
