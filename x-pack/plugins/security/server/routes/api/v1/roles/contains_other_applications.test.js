/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { containsOtherApplications } from "./contains_other_applications";

test(`returns true for roles that grant privileges to other Kibanas`, () => {
  const roles = [
    {
      _expectedResult: false,
      cluster: [],
      indices: [
        {
          names: ['logstash-*'],
          privileges: ['read']
        }
      ],
      run_as: [],
      metadata: {
        _reserved: true
      },
      transient_metadata: {
        enabled: true
      },
      name: 'logstash_reader'
    },
    {
      _expectedResult: false,
      cluster: [],
      indices: [],
      applications: [
        { application: 'kibana', privileges: ['read'], resources: ['*'] }
      ],
      run_as: [],
      metadata: {},
      transient_metadata: {
        enabled: true
      },
      name: 'kibana_user'
    },
    {
      _expectedResult: true,
      cluster: [],
      indices: [],
      applications: [
        { application: 'other-kibana', privileges: ['read'], resources: ['*'] }
      ],
      run_as: [],
      metadata: {},
      transient_metadata: {
        enabled: true
      },
      name: 'kibana_user'
    }
  ];

  roles.forEach(role => {
    const result = containsOtherApplications(role, 'kibana');
    expect(result).toEqual(role._expectedResult);
  });
});
