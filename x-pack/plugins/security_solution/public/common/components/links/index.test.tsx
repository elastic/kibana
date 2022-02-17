/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow, ReactWrapper, ShallowWrapper } from 'enzyme';
import React from 'react';
import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { encodeIpv6 } from '../../lib/helpers';
import { useUiSetting$ } from '../../lib/kibana';

import {
  GoogleLink,
  HostDetailsLink,
  NetworkDetailsLink,
  ReputationLink,
  WhoIsLink,
  CertificateFingerprintLink,
  Ja3FingerprintLink,
  PortOrServiceNameLink,
  DEFAULT_NUMBER_OF_LINK,
  ExternalLink,
} from '.';

jest.mock('../link_to');

jest.mock('../../../overview/components/events_by_dataset');

jest.mock('../../lib/kibana', () => {
  return {
    useUiSetting$: jest.fn(),
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});

describe('Custom Links', () => {
  const hostName = 'Host Name';
  const ipv4 = '192.0.2.255';
  const ipv4a = '192.0.2.266';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('HostDetailsLink', () => {
    test('should render valid link to Host Details with hostName as the display text', () => {
      const wrapper = mount(<HostDetailsLink hostName={hostName} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(`/${encodeURIComponent(hostName)}`);
      expect(wrapper.text()).toEqual(hostName);
    });

    test('should render valid link to Host Details with child text as the display text', () => {
      const wrapper = mount(<HostDetailsLink hostName={hostName}>{hostName}</HostDetailsLink>);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(`/${encodeURIComponent(hostName)}`);
      expect(wrapper.text()).toEqual(hostName);
    });
  });

  describe('NetworkDetailsLink', () => {
    test('can handle array of ips', () => {
      const wrapper = mount(<NetworkDetailsLink ip={[ipv4, ipv4a]} />);
      expect(wrapper.find('EuiLink').first().prop('href')).toEqual(
        `/ip/${encodeURIComponent(ipv4)}/source`
      );
      expect(wrapper.text()).toEqual(`${ipv4}${ipv4a}`);
      expect(wrapper.find('EuiLink').last().prop('href')).toEqual(
        `/ip/${encodeURIComponent(ipv4a)}/source`
      );
    });
    test('should render valid link to IP Details with ipv4 as the display text', () => {
      const wrapper = mount(<NetworkDetailsLink ip={ipv4} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `/ip/${encodeURIComponent(ipv4)}/source`
      );
      expect(wrapper.text()).toEqual(ipv4);
    });

    test('should render valid link to IP Details with child text as the display text', () => {
      const wrapper = mount(<NetworkDetailsLink ip={ipv4}>{hostName}</NetworkDetailsLink>);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `/ip/${encodeURIComponent(ipv4)}/source`
      );
      expect(wrapper.text()).toEqual(hostName);
    });

    test('should render valid link to IP Details with ipv6 as the display text', () => {
      const wrapper = mount(<NetworkDetailsLink ip={ipv6} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `/ip/${encodeURIComponent(ipv6Encoded)}/source`
      );
      expect(wrapper.text()).toEqual(ipv6);
    });
  });

  describe('GoogleLink', () => {
    test('it renders text passed in as value', () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={'http://example.com/'}>{'Example Link'}</GoogleLink>
      );
      expect(removeExternalLinkText(wrapper.text())).toEqual('Example Link');
    });

    test('it renders props passed in as link', () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={'http://example.com/'}>{'Example Link'}</GoogleLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.google.com/search?q=http%3A%2F%2Fexample.com%2F'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={"http://example.com?q=<script>alert('XSS')</script>"}>
          {'Example Link'}
        </GoogleLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.google.com/search?q=http%3A%2F%2Fexample.com%3Fq%3D%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('External Link', () => {
    const mockLink = 'https://www.virustotal.com/gui/search/';
    const mockLinkName = 'Link';
    let wrapper: ReactWrapper | ShallowWrapper;

    describe('render', () => {
      beforeAll(() => {
        wrapper = mount(
          <ExternalLink url={mockLink} idx={0} allItemsLimit={5} overflowIndexStart={5}>
            {mockLinkName}
          </ExternalLink>
        );
      });

      test('it renders tooltip', () => {
        expect(wrapper.find('[data-test-subj="externalLinkTooltip"]').exists()).toBeTruthy();
      });

      test('it renders ExternalLinkIcon', () => {
        expect(wrapper.find('span [data-euiicon-type="popout"]').length).toBe(1);
      });

      test('it renders correct url', () => {
        expect(wrapper.find('[data-test-subj="externalLink"]').first().prop('href')).toEqual(
          mockLink
        );
      });

      test('it renders comma if id is given', () => {
        expect(wrapper.find('[data-test-subj="externalLinkComma"]').exists()).toBeTruthy();
      });
    });

    describe('not render', () => {
      test('it should not render if childen prop is not given', () => {
        wrapper = shallow(
          <ExternalLink url={mockLink} idx={4} allItemsLimit={5} overflowIndexStart={5} />
        );
        expect(wrapper.find('[data-test-subj="externalLinkTooltip"]').exists()).toBeFalsy();
      });

      test('it should not render if url prop is not given', () => {
        wrapper = shallow(
          <ExternalLink url={''} idx={4} allItemsLimit={5} overflowIndexStart={5} />
        );
        expect(wrapper.find('[data-test-subj="externalLinkTooltip"]').exists()).toBeFalsy();
      });

      test('it should not render if url prop is invalid', () => {
        wrapper = shallow(
          <ExternalLink url={'xxx'} idx={4} allItemsLimit={5} overflowIndexStart={5} />
        );
        expect(wrapper.find('[data-test-subj="externalLinkTooltip"]').exists()).toBeFalsy();
      });

      test('it should not render comma if id is not given', () => {
        wrapper = shallow(
          <ExternalLink url={mockLink} allItemsLimit={5} overflowIndexStart={5}>
            {mockLinkName}
          </ExternalLink>
        );
        expect(wrapper.find('[data-test-subj="externalLinkComma"]').exists()).toBeFalsy();
      });

      test('it should not render comma for the last item', () => {
        wrapper = shallow(
          <ExternalLink url={mockLink} idx={4} allItemsLimit={5} overflowIndexStart={5}>
            {mockLinkName}
          </ExternalLink>
        );
        expect(wrapper.find('[data-test-subj="externalLinkComma"]').exists()).toBeFalsy();
      });
    });

    describe.each<[number, number, number, boolean]>([
      [0, 2, 5, true],
      [1, 2, 5, false],
      [2, 2, 5, false],
      [3, 2, 5, false],
      [4, 2, 5, false],
      [5, 2, 5, false],
    ])(
      'renders Comma when overflowIndex is smaller than allItems limit',
      (idx, overflowIndexStart, allItemsLimit, showComma) => {
        beforeAll(() => {
          wrapper = shallow(
            <ExternalLink
              url={mockLink}
              idx={idx}
              allItemsLimit={allItemsLimit}
              overflowIndexStart={overflowIndexStart}
            >
              {mockLinkName}
            </ExternalLink>
          );
        });

        test(`should render Comma if current id (${idx}) is smaller than the index of last visible item`, () => {
          expect(wrapper.find('[data-test-subj="externalLinkComma"]').exists()).toEqual(showComma);
        });
      }
    );

    describe.each<[number, number, number, boolean]>([
      [0, 5, 4, true],
      [1, 5, 4, true],
      [2, 5, 4, true],
      [3, 5, 4, false],
      [4, 5, 4, false],
      [5, 5, 4, false],
    ])(
      'When overflowIndex is grater than allItems limit',
      (idx, overflowIndexStart, allItemsLimit, showComma) => {
        beforeAll(() => {
          wrapper = shallow(
            <ExternalLink
              url={mockLink}
              idx={idx}
              allItemsLimit={allItemsLimit}
              overflowIndexStart={overflowIndexStart}
            >
              {mockLinkName}
            </ExternalLink>
          );
        });

        test(`Current item (${idx}) should render Comma execpt the last item`, () => {
          expect(wrapper.find('[data-test-subj="externalLinkComma"]').exists()).toEqual(showComma);
        });
      }
    );

    describe.each<[number, number, number, boolean]>([
      [0, 5, 5, true],
      [1, 5, 5, true],
      [2, 5, 5, true],
      [3, 5, 5, true],
      [4, 5, 5, false],
      [5, 5, 5, false],
    ])(
      'when overflowIndex equals to allItems limit',
      (idx, overflowIndexStart, allItemsLimit, showComma) => {
        beforeAll(() => {
          wrapper = shallow(
            <ExternalLink
              url={mockLink}
              idx={idx}
              allItemsLimit={allItemsLimit}
              overflowIndexStart={overflowIndexStart}
            >
              {mockLinkName}
            </ExternalLink>
          );
        });

        test(`Current item (${idx}) should render Comma correctly`, () => {
          expect(wrapper.find('[data-test-subj="externalLinkComma"]').exists()).toEqual(showComma);
        });
      }
    );
  });

  describe('ReputationLink', () => {
    const mockCustomizedReputationLinks = [
      { name: 'Link 1', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 2',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
      { name: 'Link 3', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 4',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
      { name: 'Link 5', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 6',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
    ];
    const mockDefaultReputationLinks = mockCustomizedReputationLinks.slice(0, 2);

    describe('links property', () => {
      beforeEach(() => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockDefaultReputationLinks]);
      });

      test('it renders default link text', () => {
        const wrapper = shallow(<ReputationLink domain={'192.0.2.0'} />);
        wrapper.find('[data-test-subj="externalLink"]').forEach((node, idx) => {
          expect(node.at(idx).text()).toEqual(mockDefaultReputationLinks[idx].name);
        });
      });

      test('it renders customized link text', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);
        const wrapper = shallow(<ReputationLink domain={'192.0.2.0'} />);
        wrapper.find('[data-test-subj="externalLink"]').forEach((node, idx) => {
          expect(node.at(idx).text()).toEqual(mockCustomizedReputationLinks[idx].name);
        });
      });

      test('it renders correct href', () => {
        const wrapper = shallow(<ReputationLink domain={'192.0.2.0'} />);
        wrapper.find('[data-test-subj="externalLink"]').forEach((node, idx) => {
          expect(node.prop('href')).toEqual(
            mockDefaultReputationLinks[idx].url_template.replace('{{ip}}', '192.0.2.0')
          );
        });
      });
    });

    describe('number of links', () => {
      beforeAll(() => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);
      });

      afterEach(() => {
        (useUiSetting$ as jest.Mock).mockClear();
      });

      test('it renders correct number of links by default', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(wrapper.find('[data-test-subj="externalLinkComponent"]')).toHaveLength(
          DEFAULT_NUMBER_OF_LINK
        );
      });

      test('it renders correct number of tooltips by default', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(wrapper.find('[data-test-subj="externalLinkTooltip"]')).toHaveLength(
          DEFAULT_NUMBER_OF_LINK
        );
      });

      test('it renders correct number of visible link', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('[data-test-subj="externalLinkComponent"]')).toHaveLength(1);
      });

      test('it renders correct number of tooltips for visible links', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('[data-test-subj="externalLinkTooltip"]')).toHaveLength(1);
      });
    });

    describe('invalid customized links', () => {
      const mockInvalidLinksEmptyObj = [{}];
      const mockInvalidLinksNoName = [
        { url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}' },
      ];
      const mockInvalidLinksNoUrl = [{ name: 'Link 1' }];
      const mockInvalidUrl = [{ name: 'Link 1', url_template: "<script>alert('XSS')</script>" }];
      afterEach(() => {
        (useUiSetting$ as jest.Mock).mockReset();
      });

      test('it filters empty object', () => {
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidLinksEmptyObj]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('[data-test-subj="externalLink"]')).toHaveLength(0);
      });

      test('it filters object without name property', () => {
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidLinksNoName]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('[data-test-subj="externalLink"]')).toHaveLength(0);
      });

      test('it filters object without url_template property', () => {
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidLinksNoUrl]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('[data-test-subj="externalLink"]')).toHaveLength(0);
      });

      test('it filters object with invalid url', () => {
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidUrl]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('[data-test-subj="externalLink"]')).toHaveLength(0);
      });
    });

    describe('external icon', () => {
      beforeAll(() => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);
      });

      afterEach(() => {
        (useUiSetting$ as jest.Mock).mockClear();
      });

      test('it renders correct number of external icons by default', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(wrapper.find('span [data-euiicon-type="popout"]')).toHaveLength(5);
      });

      test('it renders correct number of external icons', () => {
        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('span [data-euiicon-type="popout"]')).toHaveLength(1);
      });
    });
  });

  describe('WhoisLink', () => {
    test('it renders ip passed in as domain', () => {
      const wrapper = mountWithIntl(<WhoIsLink domain={'192.0.2.0'}>{'Example Link'}</WhoIsLink>);
      expect(removeExternalLinkText(wrapper.text())).toEqual('Example Link');
    });

    test('it renders correct href', () => {
      const wrapper = mountWithIntl(<WhoIsLink domain={'192.0.2.0'}>{'Example Link'} </WhoIsLink>);
      expect(wrapper.find('a').prop('href')).toEqual('https://www.iana.org/whois?q=192.0.2.0');
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <WhoIsLink domain={"<script>alert('XSS')</script>"}>{'Example Link'}</WhoIsLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.iana.org/whois?q=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('CertificateFingerprintLink', () => {
    test('it renders link text', () => {
      const wrapper = mountWithIntl(
        <CertificateFingerprintLink certificateFingerprint={'abcd'}>
          {'Example Link'}
        </CertificateFingerprintLink>
      );
      expect(removeExternalLinkText(wrapper.text())).toEqual('Example Link');
    });

    test('it renders correct href', () => {
      const wrapper = mountWithIntl(
        <CertificateFingerprintLink certificateFingerprint={'abcd'}>
          {'Example Link'}
        </CertificateFingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://sslbl.abuse.ch/ssl-certificates/sha1/abcd'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <CertificateFingerprintLink certificateFingerprint={"<script>alert('XSS')</script>"}>
          {'Example Link'}
        </CertificateFingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://sslbl.abuse.ch/ssl-certificates/sha1/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('Ja3FingerprintLink', () => {
    test('it renders link text', () => {
      const wrapper = mountWithIntl(
        <Ja3FingerprintLink ja3Fingerprint={'abcd'}>{'Example Link'}</Ja3FingerprintLink>
      );
      expect(removeExternalLinkText(wrapper.text())).toEqual('Example Link');
    });

    test('it renders correct href', () => {
      const wrapper = mountWithIntl(
        <Ja3FingerprintLink ja3Fingerprint={'abcd'}>{'Example Link'}</Ja3FingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://sslbl.abuse.ch/ja3-fingerprints/abcd'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <Ja3FingerprintLink ja3Fingerprint={"<script>alert('XSS')</script>"}>
          {'Example Link'}
        </Ja3FingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://sslbl.abuse.ch/ja3-fingerprints/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('PortOrServiceNameLink', () => {
    test('it renders link text', () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={443}>{'Example Link'}</PortOrServiceNameLink>
      );
      expect(removeExternalLinkText(wrapper.text())).toEqual('Example Link');
    });

    test('it renders correct href when port is a number', () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={443}>{'Example Link'}</PortOrServiceNameLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=443'
      );
    });

    test('it renders correct href when port is a string', () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={'80'}>{'Example Link'}</PortOrServiceNameLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=80'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={"<script>alert('XSS')</script>"}>
          {'Example Link'}
        </PortOrServiceNameLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });
});
