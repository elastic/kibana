/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import type { FieldHook } from '../../../../shared_imports';

interface Props {
  field: FieldHook;
}

export const RuleResponseActionsField: React.FC<Props> = ({ field }) => {
  const {
    triggersActionsUi: { getResponseActionForm },
  } = useKibana().services;

  // @ts-expect-error WIP
  const responseActionForm = useMemo(() => getResponseActionForm({}), [getResponseActionForm]);
  // const [value, setValue] = useState('');
  const defaultValue = {
    query: 'select * from uptime',
  };
  useEffect(() => {
    field.setValue([defaultValue]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{responseActionForm}</>;
};
