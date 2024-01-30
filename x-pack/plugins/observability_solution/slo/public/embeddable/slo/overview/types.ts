/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Subject } from 'rxjs';

export interface EmbeddableSloProps {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
  showAllGroupByInstances?: boolean;
  showGroupSLOs?: boolean; // delete this one
  overviewMode?: 'single' | 'groups';
  groupBy: string; // TODO add groupBy options
  groups: [];
  sloView: string; // TODO add sloView types
}

export type SloEmbeddableInput = EmbeddableInput & EmbeddableSloProps;
