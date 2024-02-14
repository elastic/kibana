/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expandable_section.scss';

import type { FC } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import type { ScatterplotMatrixProps } from '../../../../../components/scatterplot_matrix';
import { ScatterplotMatrix } from '../../../../../components/scatterplot_matrix';

import { ExpandableSection } from './expandable_section';

export const ExpandableSectionSplom: FC<ScatterplotMatrixProps> = (props) => {
  const splomSectionHeaderItems = undefined;
  const splomSectionContent = (
    <>
      <EuiHorizontalRule size="full" margin="none" />
      <div className="mlExpandableSection-contentPadding">
        <ScatterplotMatrix {...props} />
      </div>
    </>
  );

  return (
    <>
      <ExpandableSection
        dataTestId="splom"
        urlStateKey="splom"
        content={splomSectionContent}
        headerItems={splomSectionHeaderItems}
        isExpanded={true}
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.splomSectionTitle"
            defaultMessage="Scatterplot matrix"
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
