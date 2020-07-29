/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
// @ts-expect-error untyped local
import { WorkpadManager } from '../../../components/workpad_manager';
// @ts-expect-error untyped local
import { setDocTitle } from '../../../lib/doc_title';

interface Props {
  onLoad: () => void;
}

export const HomeApp: FC<Props> = ({ onLoad = () => {} }) => {
  onLoad();
  setDocTitle('Canvas');
  return (
    <EuiPage className="canvasHomeApp" restrictWidth>
      <EuiPageBody>
        <EuiPageContent
          className="canvasHomeApp__content"
          panelPaddingSize="none"
          horizontalPosition="center"
        >
          <WorkpadManager onClose={() => {}} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
