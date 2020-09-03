/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState } from 'react';
import { EuiButtonEmpty, EuiText, EuiSpacer } from '@elastic/eui';

const i18nTexts = {
  showAdvancedLabel: i18n.translate('xpack.indexLifecycleMgmt.advancedSection.showSectionLabel', {
    defaultMessage: 'Show advanced settings',
  }),
  hideAdvancedLabel: i18n.translate('xpack.indexLifecycleMgmt.advancedSection.hideSectionLabel', {
    defaultMessage: 'Hide advanced settings',
  }),
};

export const AdvancedSectionLayout: FunctionComponent = ({ children }) => {
  const [isShowingSection, setIsShowingSection] = useState(false);

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="advancedAllocationSettingsButton"
        flush="left"
        size="s"
        iconSide="right"
        iconType={isShowingSection ? 'arrowDown' : 'arrowRight'}
        onClick={() => {
          setIsShowingSection((v) => !v);
        }}
      >
        <EuiText size="s">
          {isShowingSection ? i18nTexts.hideAdvancedLabel : i18nTexts.showAdvancedLabel}
        </EuiText>
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
      {isShowingSection ? children : null}
    </>
  );
};
