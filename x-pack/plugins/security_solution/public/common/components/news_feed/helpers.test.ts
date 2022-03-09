/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEWS_FEED_URL_SETTING_DEFAULT } from '../../../../common/constants';
import { KibanaServices } from '../../lib/kibana';
import { rawNewsApiResponse } from '../../mock/news';
import { rawNewsJSON } from '../../mock/raw_news';

import {
  fetchNews,
  getLocale,
  getNewsFeedUrl,
  getNewsItemsFromApiResponse,
  removeSuffixFromVersion,
  showNewsItem,
} from './helpers';
import { NewsItem, RawNewsApiResponse } from './types';

jest.mock('../../lib/kibana');

describe('helpers', () => {
  describe('removeSuffixFromVersion', () => {
    test('removes entire suffix after version number', () => {
      const version = '8.0.0-SNAPSHOT-rc1';

      expect(removeSuffixFromVersion(version)).toEqual('8.0.0');
    });
    test('it should remove an all-caps `-SNAPSHOT`', () => {
      const version = '8.0.0-SNAPSHOT';

      expect(removeSuffixFromVersion(version)).toEqual('8.0.0');
    });

    test('it should remove a mixed-case `-SnApShoT`', () => {
      const version = '8.0.0-SnApShoT';

      expect(removeSuffixFromVersion(version)).toEqual('8.0.0');
    });

    test('it should NOT transform a version when it does not contain a `-SNAPSHOT`', () => {
      const version = '8.0.0';

      expect(removeSuffixFromVersion(version)).toEqual('8.0.0');
    });

    test('it should transform a version if it omits the dash in `SNAPSHOT`', () => {
      const version = '8.0.0SNAPSHOT';

      expect(removeSuffixFromVersion(version)).toEqual('8.0.0');
    });

    test('it should NOT transform an undefined version', () => {
      const version = undefined;

      expect(removeSuffixFromVersion(version)).toBeUndefined();
    });

    test('it should NOT transform an empty version', () => {
      const version = '';

      expect(removeSuffixFromVersion(version)).toEqual('');
    });
  });

  describe('getNewsFeedUrl', () => {
    const getKibanaVersion = () => '8.0.0';

    test('it combines the (default) base URL from settings and the Kibana version to return the expected URL', () => {
      expect(
        getNewsFeedUrl({ newsFeedUrlSetting: NEWS_FEED_URL_SETTING_DEFAULT, getKibanaVersion })
      ).toEqual('https://feeds.elastic.co/security-solution/v8.0.0.json');
    });

    test('it combines a URL with extra whitespace and the Kibana version to return the expected URL', () => {
      const withExtraWhitespace = `   ${NEWS_FEED_URL_SETTING_DEFAULT}   `;

      expect(getNewsFeedUrl({ newsFeedUrlSetting: withExtraWhitespace, getKibanaVersion })).toEqual(
        'https://feeds.elastic.co/security-solution/v8.0.0.json'
      );
    });

    test('it combines a URL with a trailing slash and the Kibana version to return the expected URL', () => {
      const withTrailingSlash = `${NEWS_FEED_URL_SETTING_DEFAULT}/`;

      expect(getNewsFeedUrl({ newsFeedUrlSetting: withTrailingSlash, getKibanaVersion })).toEqual(
        'https://feeds.elastic.co/security-solution/v8.0.0.json'
      );
    });

    test('it combines a URL with a trailing slash plus whitespace and the Kibana version to return the expected URL', () => {
      const withTrailingSlashPlusWhitespace = `   ${NEWS_FEED_URL_SETTING_DEFAULT}/   `;

      expect(
        getNewsFeedUrl({ newsFeedUrlSetting: withTrailingSlashPlusWhitespace, getKibanaVersion })
      ).toEqual('https://feeds.elastic.co/security-solution/v8.0.0.json');
    });

    test('it combines a URL and a Kibana version with a `-SNAPSHOT` to return the expected URL', () => {
      const getKibanaVersionWithSnapshot = () => '8.0.0-SNAPSHOT';

      expect(
        getNewsFeedUrl({
          newsFeedUrlSetting: NEWS_FEED_URL_SETTING_DEFAULT,
          getKibanaVersion: getKibanaVersionWithSnapshot,
        })
      ).toEqual('https://feeds.elastic.co/security-solution/v8.0.0.json');
    });
  });

  describe('getLocale', () => {
    const fallback = 'wowzers';

    test('it returns language specified in the document', () => {
      const lang = 'ja';

      document.documentElement.lang = lang;

      expect(getLocale(fallback)).toEqual(lang);
    });

    test('it returns the fallback when the language in the document is an empty string', () => {
      document.documentElement.lang = '';

      expect(getLocale(fallback)).toEqual(fallback);
    });
  });

  describe('getNewsItemsFromApiResponse', () => {
    const expectedNewsItems: NewsItem[] = [
      {
        description:
          "There's an awesome community of Elastic SIEM users out there. Join the discussion about configuring, learning, and using the Elastic SIEM app, and detecting threats!",
        expireOn: expect.any(Date),
        hash: '5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0',
        imageUrl:
          'https://aws1.discourse-cdn.com/elastic/original/3X/f/8/f8c3d0b9971cfcd0be349d973aa5799f71d280cc.png?blade=securitysolutionfeed',
        linkUrl: 'https://discuss.elastic.co/c/security?blade=securitysolutionfeed',
        publishOn: expect.any(Date),
        title: 'Got SIEM Questions?',
      },
      {
        description:
          'Elastic Security combines the threat hunting and analytics of Elastic SIEM with the prevention and response provided by Elastic Endpoint Security.',
        expireOn: expect.any(Date),
        hash: 'edcb2d396ffdd80bfd5a97fbc0dc9f4b73477f9be556863fe0a1caf086679420',
        imageUrl:
          'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt1caa35177420c61b/5d0d0394d8ff351753cbf2c5/illustrated-screenshot-hero-siem.png?blade=securitysolutionfeed',
        linkUrl:
          'https://www.elastic.co/blog/elastic-security-7-5-0-released?blade=securitysolutionfeed',
        publishOn: expect.any(Date),
        title: 'Elastic Security 7.5.0 released',
      },
      {
        description:
          'At Elastic, we’re bringing endpoint protection and SIEM together into the same experience to streamline how you secure your organization.',
        expireOn: expect.any(Date),
        hash: 'ec970adc85e9eede83f77e4cc6a6fea00cd7822cbe48a71dc2c5f1df10939196',
        imageUrl:
          'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/bltd0eb8689eafe398a/5d970ecc1970e80e85277925/illustration-endpoint-hero.png?blade=securitysolutionfeed',
        linkUrl:
          'https://www.elastic.co/webinars/elastic-endpoint-security-overview-security-starts-at-the-endpoint?blade=securitysolutionfeed',
        publishOn: expect.any(Date),
        title: 'Elastic Endpoint Security Overview Webinar',
      },
      {
        description:
          'For small businesses and homes, having access to effective security analytics can come at a high cost of either time or money. Well, until now!',
        expireOn: expect.any(Date),
        hash: 'aa243fd5845356a5ccd54a7a11b208ed307e0d88158873b1fcf7d1164b739bac',
        imageUrl:
          'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt024c26b7636cb24f/5daf4e293a326d6df6c0e025/home-siem-blog-1-map.jpg?blade=securitysolutionfeed',
        linkUrl:
          'https://www.elastic.co/blog/elastic-siem-for-small-business-and-home-1-getting-started?blade=securitysolutionfeed',
        publishOn: expect.any(Date),
        title: 'Trying Elastic SIEM at Home?',
      },
      {
        description:
          'Elastic is excited to announce the introduction of Elastic Endpoint Security, based on Elastic’s acquisition of Endgame, a pioneer and industry-recognized leader in endpoint threat prevention, detection, and response.',
        expireOn: expect.any(Date),
        hash: '3c64576c9749d33ff98726d641cdf2fb2bfde3dd9a6f99ff2573ac8d8c5b2c02',
        imageUrl:
          'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt1f87637fb7870298/5d9fe27bf8ca980f8717f6f8/screenshot-resolver-trickbot-enrichments-showing-defender-shutdown-endgame-2-optimized.png?blade=securitysolutionfeed',
        linkUrl:
          'https://www.elastic.co/blog/introducing-elastic-endpoint-security?blade=securitysolutionfeed',
        publishOn: expect.any(Date),
        title: 'Introducing Elastic Endpoint Security',
      },
      {
        description:
          'Elastic SIEM is powered by Elastic Common Schema. With ECS, analytics content such as dashboards, rules, and machine learning jobs can be applied more broadly, searches can be crafted more narrowly, and field names are easier to remember.',
        expireOn: expect.any(Date),
        hash: 'b8a0d3d21e9638bde891ab5eb32594b3d7a3daacc7f0900c6dd506d5d7b42410',
        imageUrl:
          'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt71256f06dc672546/5c98d595975fd58f4d12646d/ecs-intro-dashboard-1360.jpg?blade=securitysolutionfeed',
        linkUrl:
          'https://www.elastic.co/blog/introducing-the-elastic-common-schema?blade=securitysolutionfeed',
        publishOn: expect.any(Date),
        title: 'What is Elastic Common Schema (ECS)?',
      },
    ];

    test('it returns an empty collection of news items when the response is undefined', () => {
      expect(getNewsItemsFromApiResponse(undefined)).toEqual([]);
    });

    test('it returns an empty collection of news items when the response is null', () => {
      expect(getNewsItemsFromApiResponse(null)).toEqual([]);
    });

    test('it returns an empty collection of news items when the response items are undefined', () => {
      expect(getNewsItemsFromApiResponse({ items: undefined })).toEqual([]);
    });

    test('it returns an empty collection of news items when the response items are null', () => {
      expect(getNewsItemsFromApiResponse({ items: null })).toEqual([]);
    });

    test('it returns the expected news items when the browser language matches the i18n values in the response', () => {
      const lang = 'en';

      document.documentElement.lang = lang;

      expect(getNewsItemsFromApiResponse(rawNewsApiResponse)).toEqual(expectedNewsItems);
    });

    test('it returns the expected news items when an ALL CAPS the browser language matches the i18n values in the response', () => {
      const allCapsLang = 'EN';

      document.documentElement.lang = allCapsLang;

      expect(getNewsItemsFromApiResponse(rawNewsApiResponse)).toEqual(expectedNewsItems);
    });

    test('it returns the expected news items when the browser language does NOT match the i18n values in the response', () => {
      const nonMatchingLang = 'ja';

      document.documentElement.lang = nonMatchingLang;

      expect(getNewsItemsFromApiResponse(rawNewsApiResponse)).toEqual(expectedNewsItems);
    });

    test('it returns the expected news items when the browser language is an empty string', () => {
      const emptyLang = '';

      document.documentElement.lang = emptyLang;

      expect(getNewsItemsFromApiResponse(rawNewsApiResponse)).toEqual(expectedNewsItems);
    });

    test('it returns the expected news item when parsing a raw JSON response', () => {
      const lang = 'en';

      document.documentElement.lang = lang;

      expect(getNewsItemsFromApiResponse(JSON.parse(rawNewsJSON))).toEqual(expectedNewsItems);
    });

    describe('translated items', () => {
      const translatedDescription =
        'Elastic SIEMユーザーの素晴らしいコミュニティがそこにあります。 Elastic SIEMアプリの設定、学習、使用、および脅威の検出に関するディスカッションに参加してください！';
      const translatedImageUrl = 'https://aws1.discourse-cdn.com/elastic/translated-image-url';
      const translatedLinkUrl = 'https://discuss.elastic.co/translated-link-url';
      const translatedTitle = 'SIEMに関する質問はありますか？';

      const withNonDefaultTranslations: RawNewsApiResponse = {
        items: [
          {
            title: { en: 'Got SIEM Questions?', ja: translatedTitle },
            description: {
              en: "There's an awesome community of Elastic SIEM users out there. Join the discussion about configuring, learning, and using the Elastic SIEM app, and detecting threats!",
              ja: translatedDescription,
            },
            link_text: null,
            link_url: {
              en: 'https://discuss.elastic.co/c/security?blade=securitysolutionfeed',
              ja: translatedLinkUrl,
            },
            languages: null,
            badge: { en: '7.6' },
            image_url: {
              en: 'https://aws1.discourse-cdn.com/elastic/original/3X/f/8/f8c3d0b9971cfcd0be349d973aa5799f71d280cc.png?blade=securitysolutionfeed',
              ja: translatedImageUrl,
            },
            publish_on: new Date('2020-01-01T00:00:00'),
            expire_on: new Date('2020-12-31T00:00:00'),
          },
        ],
      };

      test('it returns a translated description when the browser language matches additional translated content', () => {
        const lang = 'ja'; // an additional translation for this language is provided in the response

        document.documentElement.lang = lang;

        expect(getNewsItemsFromApiResponse(withNonDefaultTranslations)[0].description).toEqual(
          translatedDescription
        );
      });

      test('it returns a translated imageUrl when the browser language matches additional translated content', () => {
        const lang = 'ja'; // a translation for this language is provided in the response

        document.documentElement.lang = lang;

        expect(getNewsItemsFromApiResponse(withNonDefaultTranslations)[0].imageUrl).toEqual(
          translatedImageUrl
        );
      });

      test('it returns a translated linkUrl when the browser language matches additional translated content', () => {
        const lang = 'ja'; // a translation for this language is provided in the response

        document.documentElement.lang = lang;

        expect(getNewsItemsFromApiResponse(withNonDefaultTranslations)[0].linkUrl).toEqual(
          translatedLinkUrl
        );
      });

      test('it returns a translated title when the browser language matches additional translated content', () => {
        const lang = 'ja'; // a translation for this language is provided in the response

        document.documentElement.lang = lang;

        expect(getNewsItemsFromApiResponse(withNonDefaultTranslations)[0].title).toEqual(
          translatedTitle
        );
      });

      test('it returns the default translated title when the browser language matches additional translated content', () => {
        const lang = 'fr'; // no translation for this language

        document.documentElement.lang = lang;

        expect(getNewsItemsFromApiResponse(withNonDefaultTranslations)[0].title).toEqual(
          'Got SIEM Questions?'
        );
      });

      test('it returns the default translated title when the browser language is an empty string', () => {
        const lang = ''; // just an empty string

        document.documentElement.lang = lang;

        expect(getNewsItemsFromApiResponse(withNonDefaultTranslations)[0].title).toEqual(
          'Got SIEM Questions?'
        );
      });
    });

    test('it generates a news item hash when an item does NOT include it', () => {
      const lang = 'en';

      const itemHasNoHash: RawNewsApiResponse = {
        items: [
          {
            title: { en: 'Got SIEM Questions?' },
            description: {
              en: 'some description',
            },
            link_text: null,
            link_url: { en: 'https://example.com/link-url' },
            languages: null,
            badge: { en: '7.6' },
            image_url: {
              en: 'https://example.com/image-url',
            },
            publish_on: new Date('2020-01-01T00:00:00'),
            expire_on: new Date('2020-12-31T00:00:00'),
          },
        ],
      };

      document.documentElement.lang = lang;

      expect(getNewsItemsFromApiResponse(itemHasNoHash)[0].hash.length).toBeGreaterThan(0);
    });
  });

  describe('fetchNews', () => {
    const mockKibanaServices = KibanaServices.get as jest.Mock;
    const fetchMock = jest.fn();
    mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(rawNewsApiResponse);
    });

    test('it returns the raw API response from the news feed', async () => {
      const newsFeedUrl = 'https://feeds.elastic.co/security-solution/v8.0.0.json';
      expect(await fetchNews({ newsFeedUrl })).toEqual(rawNewsApiResponse);
    });
  });

  describe('showNewsItem', () => {
    const MOCK_DATE_NOW = 1579848101395; // 2020-01-24T06:41:41.395Z

    let dateNowSpy: { mockRestore: () => void };

    beforeAll(() => {
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => MOCK_DATE_NOW);
    });

    afterAll(() => {
      dateNowSpy.mockRestore();
    });

    test('it should return true when the article has already been published, and will expire in the future', () => {
      const alreadyPublishedAndNotExpired: NewsItem = {
        description: 'description',
        expireOn: new Date(MOCK_DATE_NOW + 1000),
        hash: '5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0',
        imageUrl: 'https://example.com',
        linkUrl: 'https://example.com',
        publishOn: new Date(MOCK_DATE_NOW - 1000),
        title: 'Show this post',
      };

      expect(showNewsItem(alreadyPublishedAndNotExpired)).toEqual(true);
    });

    test('it should return false when the article was published exactly "now", and will expire in the future', () => {
      const publishedJustNowAndNotExpired: NewsItem = {
        description: 'description',
        expireOn: new Date(MOCK_DATE_NOW + 1000),
        hash: '5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0',
        imageUrl: 'https://example.com',
        linkUrl: 'https://example.com',
        publishOn: new Date(MOCK_DATE_NOW),
        title: 'Do NOT show this post',
      };

      expect(showNewsItem(publishedJustNowAndNotExpired)).toEqual(false);
    });

    test('it should return false when the article has not been published yet, and has not expired yet', () => {
      const notPublishedAndNotExpired: NewsItem = {
        description: 'description',
        expireOn: new Date(MOCK_DATE_NOW + 5000),
        hash: '5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0',
        imageUrl: 'https://example.com',
        linkUrl: 'https://example.com',
        publishOn: new Date(MOCK_DATE_NOW + 1000),
        title: 'Do NOT show this post',
      };

      expect(showNewsItem(notPublishedAndNotExpired)).toEqual(false);
    });

    test('it should return false when the article was published in the past, and will expire exactly now', () => {
      const alreadyPublishedAndExpiredNow: NewsItem = {
        description: 'description',
        expireOn: new Date(MOCK_DATE_NOW),
        hash: '5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0',
        imageUrl: 'https://example.com',
        linkUrl: 'https://example.com',
        publishOn: new Date(MOCK_DATE_NOW - 1000),
        title: 'Do NOT show this post',
      };

      expect(showNewsItem(alreadyPublishedAndExpiredNow)).toEqual(false);
    });

    test('it should return false when the article was published in the past, and it already expired', () => {
      const articleJustExpired: NewsItem = {
        description: 'description',
        expireOn: new Date(MOCK_DATE_NOW - 1000),
        hash: '5a35c984a9cdc1c6a25913f3d0b99b1aefc7257bc3b936c39db9fa0435edeed0',
        imageUrl: 'https://example.com',
        linkUrl: 'https://example.com',
        publishOn: new Date(MOCK_DATE_NOW - 5000),
        title: 'Do NOT show this post',
      };

      expect(showNewsItem(articleJustExpired)).toEqual(false);
    });
  });
});
