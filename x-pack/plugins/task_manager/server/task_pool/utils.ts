/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskCost } from '../task';

// When configured capacity is the number of normal cost tasks that this Kibana
// can run, the total available workers equals the capacity
export const getCapacityInWorkers = (capacity: number) => capacity;

// When configured capacity is the number of normal cost tasks that this Kibana
// can run, the total available cost equals the capacity multiplied by the cost of a normal task
export const getCapacityInCost = (capacity: number) => capacity * TaskCost.Normal;
