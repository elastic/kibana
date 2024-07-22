/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

export const addTestMonitorProject = async (
  kibanaUrl: string,
  name: string,
  projectName: string = 'test-project',
  config?: Record<string, unknown>
) => {
  const testData = {
    ...testProjectMonitorBrowser(name, config),
  };
  try {
    return await axios.put(
      kibanaUrl +
        SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
          '{projectName}',
          projectName
        ),
      testData,
      {
        auth: { username: 'elastic', password: 'changeme' },
        headers: { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'synthetics-e2e' },
      }
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

const testProjectMonitorBrowser = (name: string, config?: Record<string, unknown>) => ({
  monitors: [
    {
      type: 'browser',
      throttling: {
        download: 5,
        upload: 3,
        latency: 20,
      },
      schedule: 10,
      locations: ['us_central'],
      params: {},
      playwrightOptions: {
        headless: true,
        chromiumSandbox: false,
      },
      custom_heartbeat_id: 'check-if-title-is-present',
      id: 'check-if-title-is-present',
      tags: [],
      content:
        'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
      filter: {
        match: 'check if title is present',
      },
      hash: 'ekrjelkjrelkjre',
      name,
      ...config,
    },
  ],
});
