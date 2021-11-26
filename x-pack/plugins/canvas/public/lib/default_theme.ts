/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreTheme } from 'kibana/public';
import { Observable } from 'rxjs';

export const defaultTheme$: Observable<CoreTheme> = new Observable((subscriber) =>
  subscriber.next({ darkMode: false })
);
