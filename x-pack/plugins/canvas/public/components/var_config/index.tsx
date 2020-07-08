/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import copy from 'copy-to-clipboard';
import { VarConfig as ChildComponent } from './var_config';
import {
  withKibana,
  KibanaReactContextValue,
  KibanaServices,
} from '../../../../../../src/plugins/kibana_react/public';
import { CanvasServices } from '../../services';

import { ComponentStrings } from '../../../i18n';

import { CanvasVariable } from '../../../types';

const { VarConfig: strings } = ComponentStrings;

interface Props {
  kibana: KibanaReactContextValue<{ canvas: CanvasServices } & KibanaServices>;

  variables: CanvasVariable[];
  setVariables: (variables: CanvasVariable[]) => void;
}

const WrappedComponent: FC<Props> = ({ kibana, variables, setVariables }) => {
  const onDeleteVar = (v: CanvasVariable) => {
    const index = variables.findIndex((targetVar: CanvasVariable) => {
      return targetVar.name === v.name;
    });
    if (index !== -1) {
      const newVars = [...variables];
      newVars.splice(index, 1);
      setVariables(newVars);

      kibana.services.canvas.notify.success(strings.getDeleteNotificationDescription());
    }
  };

  const onCopyVar = (v: CanvasVariable) => {
    const snippetStr = `{var "${v.name}"}`;
    copy(snippetStr, { debug: true });
    kibana.services.canvas.notify.success(strings.getCopyNotificationDescription());
  };

  const onAddVar = (v: CanvasVariable) => {
    setVariables([...variables, v]);
  };

  const onEditVar = (oldVar: CanvasVariable, newVar: CanvasVariable) => {
    const existingVarIndex = variables.findIndex((v) => oldVar.name === v.name);

    const newVars = [...variables];
    newVars[existingVarIndex] = newVar;

    setVariables(newVars);
  };

  return <ChildComponent {...{ variables, onCopyVar, onDeleteVar, onAddVar, onEditVar }} />;
};

export const VarConfig = withKibana(WrappedComponent);
