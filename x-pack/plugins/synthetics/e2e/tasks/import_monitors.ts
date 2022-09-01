/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

export const importMonitors = async ({
  kibanaUrl,
  username,
  password,
}: {
  kibanaUrl: string;
  username?: string;
  password?: string;
}) => {
  // eslint-disable-next-line no-console
  console.log('Loading sample monitors');

  const jsonData = {
    type: 'browser',
    enabled: true,
    schedule: { unit: 'm', number: '10' },
    'service.name': '',
    tags: [],
    timeout: null,
    name: 'Browser monitor',
    locations: [{ id: 'us_central', isServiceManaged: true }],
    namespace: 'default',
    origin: 'ui',
    journey_id: '',
    project_id: '',
    playwright_options: '',
    __ui: {
      script_source: { is_generated_script: false, file_name: '' },
      is_zip_url_tls_enabled: false,
      is_tls_enabled: false,
    },
    params: '',
    'url.port': null,
    'source.inline.script':
      "const username = 'diawar.khan.shewani+conduit@gmail.com';\nconst password = 'aNL2sTGRbNYauc8';\n// Goto https://demo.realworld.io/ and sign up for username and password\n\nconst articleTitle = 'Artile No. ' + Math.ceil(Math.random() * 1000);\n\nstep(\"Goto home page\", async () => {\n  await page.goto('https://demo.realworld.io/');\n});\n\nstep(\"Goto login page\", async () => {\n  await page.click('text=Sign in');\n});\n\nstep(\"Enter login credentials\", async () => {\n  await page.fill('[placeholder=\"Email\"]', username);\n  await page.fill('[placeholder=\"Password\"]', password);\n});\n\nstep(\"Sign in\", async () => {\n  await page.click('button[type=submit]');\n});\n\nstep(\"Create article\", async () => {\n  const articleSubject = 'Test article subject';\n  const articleBody = 'This ariticle is created with **synthetics** for purely testing purposes.';\n\n  await page.click('text=New Article');\n  await page.fill('[placeholder=\"Article Title\"]', articleTitle);\n  await page.fill('[placeholder=\"What\\'s this article about?\"]', articleSubject);\n  await page.fill('textarea', articleBody);\n});\n\nstep(\"Publish article\", async () => {\n  await page.click('text=Publish Article');\n  await page.waitForNavigation();\n\n  // Fail about 30% of random times\n  const passFailText = Math.random() * 10 > 7 ? 'non-existent-text' : articleTitle ;\n  await page.waitForSelector('text=' + articleTitle);\n});\n\nstep(\"Post 1st comment\", async() => {\n  const firstCommentText = 'First comment!';\n  await page.fill('[placeholder=\"Write a comment...\"]', firstCommentText);\n  await page.click('text=Post Comment');\n  await page.waitForSelector('text=' + firstCommentText);\n});",
    'source.project.content': '',
    'source.zip_url.url': '',
    'source.zip_url.username': '',
    'source.zip_url.password': '',
    'source.zip_url.folder': '',
    'source.zip_url.proxy_url': '',
    urls: '',
    screenshots: 'on',
    synthetics_args: [],
    'filter_journeys.match': '',
    'filter_journeys.tags': [],
    ignore_https_errors: false,
    'throttling.is_enabled': true,
    'throttling.download_speed': '5',
    'throttling.upload_speed': '3',
    'throttling.latency': '20',
    'throttling.config': '5d/3u/20l',
  };

  const id = '1c215bd0-f580-11ec-89e5-694db461b7a5';

  try {
    axios
      .request({
        method: 'post',
        url: kibanaUrl + '/internal/uptime/service/monitors?id=' + id,
        auth: { username: username ?? 'elastic', password: password ?? 'changeme' },
        headers: { 'kbn-xsrf': 'true' },
        data: jsonData,
      })
      .then(({ data }) => {
        if (data.id === id) {
          // eslint-disable-next-line no-console
          console.info('Successfully imported 1 monitor');
        }
      });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};
