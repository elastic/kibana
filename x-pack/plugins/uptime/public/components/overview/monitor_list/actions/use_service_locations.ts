/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '../../../../../../observability/public';

export const useServiceLocations = () => {
  const { data: locations } = useFetcher(async () => {
    const response = await fetch('https://manifest.synthetics.elastic.dev/v1/manifest.json', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }, []);

  console.log(locations);
  return {
    locations: {
      us_central: {
        url: 'https://us-central.synthetics.elastic.dev',
        geo: {
          name: 'US Central',
          location: {
            lat: 41.25,
            lon: -95.86,
          },
        },
        status: 'beta',
      },
    },
  };
};
