/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';

import { VarConfig } from '../var_config';

import { CanvasVariable } from '../../../types';
import { ComponentStrings } from '../../../i18n';
import { WorkpadSize } from './workpad_size';
import { WorkpadCSS } from './workpad_css';

const { WorkpadConfig: strings } = ComponentStrings;

interface Props {
  name: string;
  setName: (name: string) => void;
  setWorkpadVariables: (vars: CanvasVariable[]) => void;
  variables: CanvasVariable[];
}

export const WorkpadConfig: FC<Props> = (props) => {
  const { name, setName, variables, setWorkpadVariables } = props;

  return (
    <div>
      <div className="canvasLayout__sidebarHeaderWorkpad">
        <EuiTitle size="xs">
          <h4>{strings.getTitle()}</h4>
        </EuiTitle>
      </div>
      <EuiSpacer size="m" />
      <EuiFormRow label={strings.getNameLabel()} display="rowCompressed">
        <EuiFieldText compressed value={name} onChange={(e) => setName(e.target.value)} />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <WorkpadSize />
      <EuiSpacer size="m" />
      <VarConfig variables={variables} setVariables={setWorkpadVariables} />
      <WorkpadCSS />
    </div>
  );
};

WorkpadConfig.propTypes = {
  name: PropTypes.string.isRequired,
  setName: PropTypes.func.isRequired,
  variables: PropTypes.array,
  setWorkpadVariables: PropTypes.func.isRequired,
};
