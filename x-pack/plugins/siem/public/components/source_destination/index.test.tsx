/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { get } from 'lodash/fp';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { asArrayIfExists } from '../../lib/helpers';
import { getMockNetflowData } from '../../mock';
import { TestProviders } from '../../mock/test_providers';
import { ID_FIELD_NAME } from '../event_details/event_id';
import { DESTINATION_IP_FIELD_NAME } from '../ip';
import { SOURCE_IP_FIELD_NAME } from '../ip';
import { DESTINATION_PORT_FIELD_NAME, SOURCE_PORT_FIELD_NAME } from '../port';
import {
  DESTINATION_BYTES_FIELD_NAME,
  DESTINATION_PACKETS_FIELD_NAME,
  SOURCE_BYTES_FIELD_NAME,
  SOURCE_PACKETS_FIELD_NAME,
} from '../source_destination/source_destination_arrows';
import * as i18n from '../timeline/body/renderers/translations';

import { SourceDestination } from '.';
import {
  DESTINATION_GEO_CITY_NAME_FIELD_NAME,
  DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME,
  DESTINATION_GEO_REGION_NAME_FIELD_NAME,
  SOURCE_GEO_CITY_NAME_FIELD_NAME,
  SOURCE_GEO_CONTINENT_NAME_FIELD_NAME,
  SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME,
  SOURCE_GEO_COUNTRY_NAME_FIELD_NAME,
  SOURCE_GEO_REGION_NAME_FIELD_NAME,
} from './geo_fields';
import {
  NETWORK_BYTES_FIELD_NAME,
  NETWORK_COMMUNITY_ID_FIELD_NAME,
  NETWORK_DIRECTION_FIELD_NAME,
  NETWORK_PACKETS_FIELD_NAME,
  NETWORK_PROTOCOL_FIELD_NAME,
  NETWORK_TRANSPORT_FIELD_NAME,
} from './field_names';

const getSourceDestinationInstance = () => (
  <SourceDestination
    contextId="test"
    destinationBytes={asArrayIfExists(get(DESTINATION_BYTES_FIELD_NAME, getMockNetflowData()))}
    destinationGeoContinentName={asArrayIfExists(
      get(DESTINATION_GEO_CONTINENT_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoCountryName={asArrayIfExists(
      get(DESTINATION_GEO_COUNTRY_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoCountryIsoCode={asArrayIfExists(
      get(DESTINATION_GEO_COUNTRY_ISO_CODE_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoRegionName={asArrayIfExists(
      get(DESTINATION_GEO_REGION_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationGeoCityName={asArrayIfExists(
      get(DESTINATION_GEO_CITY_NAME_FIELD_NAME, getMockNetflowData())
    )}
    destinationIp={asArrayIfExists(get(DESTINATION_IP_FIELD_NAME, getMockNetflowData()))}
    destinationPackets={asArrayIfExists(get(DESTINATION_PACKETS_FIELD_NAME, getMockNetflowData()))}
    destinationPort={asArrayIfExists(get(DESTINATION_PORT_FIELD_NAME, getMockNetflowData()))}
    eventId={get(ID_FIELD_NAME, getMockNetflowData())}
    networkBytes={asArrayIfExists(get(NETWORK_BYTES_FIELD_NAME, getMockNetflowData()))}
    networkCommunityId={asArrayIfExists(get(NETWORK_COMMUNITY_ID_FIELD_NAME, getMockNetflowData()))}
    networkDirection={asArrayIfExists(get(NETWORK_DIRECTION_FIELD_NAME, getMockNetflowData()))}
    networkPackets={asArrayIfExists(get(NETWORK_PACKETS_FIELD_NAME, getMockNetflowData()))}
    networkProtocol={asArrayIfExists(get(NETWORK_PROTOCOL_FIELD_NAME, getMockNetflowData()))}
    sourceBytes={asArrayIfExists(get(SOURCE_BYTES_FIELD_NAME, getMockNetflowData()))}
    sourceGeoContinentName={asArrayIfExists(
      get(SOURCE_GEO_CONTINENT_NAME_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoCountryName={asArrayIfExists(
      get(SOURCE_GEO_COUNTRY_NAME_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoCountryIsoCode={asArrayIfExists(
      get(SOURCE_GEO_COUNTRY_ISO_CODE_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoRegionName={asArrayIfExists(
      get(SOURCE_GEO_REGION_NAME_FIELD_NAME, getMockNetflowData())
    )}
    sourceGeoCityName={asArrayIfExists(get(SOURCE_GEO_CITY_NAME_FIELD_NAME, getMockNetflowData()))}
    sourceIp={asArrayIfExists(get(SOURCE_IP_FIELD_NAME, getMockNetflowData()))}
    sourcePackets={asArrayIfExists(get(SOURCE_PACKETS_FIELD_NAME, getMockNetflowData()))}
    sourcePort={asArrayIfExists(get(SOURCE_PORT_FIELD_NAME, getMockNetflowData()))}
    transport={asArrayIfExists(get(NETWORK_TRANSPORT_FIELD_NAME, getMockNetflowData()))}
  />
);

describe('SourceDestination', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<div>{getSourceDestinationInstance()}</div>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it renders a destination label', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination-label"]')
        .first()
        .text()
    ).toEqual(i18n.DESTINATION);
  });

  test('it renders destination.bytes', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination-bytes"]')
        .first()
        .text()
    ).toEqual('40.000 B');
  });

  test('it renders destination.geo.continent_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination.geo.continent_name"]')
        .first()
        .text()
    ).toEqual('North America');
  });

  test('it renders destination.geo.country_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination.geo.country_name"]')
        .first()
        .text()
    ).toEqual('United States');
  });

  test('it renders destination.geo.country_iso_code', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination.geo.country_iso_code"]')
        .first()
        .text()
    ).toEqual('US');
  });

  test('it renders destination.geo.region_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination.geo.region_name"]')
        .first()
        .text()
    ).toEqual('New York');
  });

  test('it renders destination.geo.city_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination.geo.city_name"]')
        .first()
        .text()
    ).toEqual('New York');
  });

  test('it renders the destination ip and port, separated with a colon', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination-ip-and-port"]')
        .first()
        .text()
    ).toEqual('10.1.2.3:80');
  });

  test('it renders destination.packets', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination-packets"]')
        .first()
        .text()
    ).toEqual('1 pkts');
  });

  test('it hyperlinks links destination.port to an external service that describes the purpose of the port', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="destination-ip-and-port"]')
        .find('[data-test-subj="port-or-service-name-link"]')
        .first()
        .props().href
    ).toEqual(
      'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=80'
    );
  });

  test('it renders network.bytes', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="network-bytes"]')
        .first()
        .text()
    ).toEqual('100.000 B');
  });

  test('it renders network.community_id', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="network-community-id"]')
        .first()
        .text()
    ).toEqual('we.live.in.a');
  });

  test('it renders network.direction', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="network-direction"]')
        .first()
        .text()
    ).toEqual('outgoing');
  });

  test('it renders network.packets', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="network-packets"]')
        .first()
        .text()
    ).toEqual('3 pkts');
  });

  test('it renders network.protocol', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="network-protocol"]')
        .first()
        .text()
    ).toEqual('http');
  });

  test('it renders a source label', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source-label"]')
        .first()
        .text()
    ).toEqual(i18n.SOURCE);
  });

  test('it renders source.bytes', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source-bytes"]')
        .first()
        .text()
    ).toEqual('60.000 B');
  });

  test('it renders source.geo.continent_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source.geo.continent_name"]')
        .first()
        .text()
    ).toEqual('North America');
  });

  test('it renders source.geo.country_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source.geo.country_name"]')
        .first()
        .text()
    ).toEqual('United States');
  });

  test('it renders source.geo.country_iso_code', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source.geo.country_iso_code"]')
        .first()
        .text()
    ).toEqual('US');
  });

  test('it renders source.geo.region_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source.geo.region_name"]')
        .first()
        .text()
    ).toEqual('Georgia');
  });

  test('it renders source.geo.city_name', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source.geo.city_name"]')
        .first()
        .text()
    ).toEqual('Atlanta');
  });

  test('it renders the source ip and port, separated with a colon', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source-ip-and-port"]')
        .first()
        .text()
    ).toEqual('192.168.1.2:9987');
  });

  test('it renders source.packets', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="source-packets"]')
        .first()
        .text()
    ).toEqual('2 pkts');
  });

  test('it renders network.transport', () => {
    const wrapper = mountWithIntl(<TestProviders>{getSourceDestinationInstance()}</TestProviders>);

    expect(
      wrapper
        .find('[data-test-subj="network-transport"]')
        .first()
        .text()
    ).toEqual('tcp');
  });
});
