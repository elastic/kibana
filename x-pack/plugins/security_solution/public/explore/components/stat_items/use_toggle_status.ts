/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useQueryToggle } from '../../../common/containers/query_toggle';

export const useToggleStatus = ({
  id,
  setQuerySkip,
}: {
  id: string;
  setQuerySkip: (skip: boolean) => void;
}) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(id);

  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggleStatus on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );
  const onToggle = useCallback(() => toggleQuery(!toggleStatus), [toggleQuery, toggleStatus]);

  return {
    isToggleExpanded: toggleStatus,
    onToggle,
  };
};
