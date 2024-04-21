/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare const ValidateJob: (props: {
  getJobConfig: any;
  getDuration: any;
  ml: any;
  embedded?: boolean;
  setIsValid?: (valid: boolean) => void;
  idFilterList?: string[];
}) => JSX.Element;
