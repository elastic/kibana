/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLoadSnapshotRepositories } from '../../../../../../services/api';

interface Props {
  children: (arg: ReturnType<typeof useLoadSnapshotRepositories>) => JSX.Element;
}

export const SearchableSnapshotDataProvider = ({ children }: Props) => {
  return children(useLoadSnapshotRepositories());
};
