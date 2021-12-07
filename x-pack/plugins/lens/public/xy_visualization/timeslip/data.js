export const dataSource = Symbol('dataSource')

const nullResponse = {aggregations: {my_date_histo: {buckets: []}}}

const withXhr = ({url, user, password}, route, query, vercel) =>
  new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.responseType = 'json'
    xhr.onerror = (error) => {
      console.error(`Couldn't reach the Elasticsearch server, response: ${xhr.response}`)
      console.log({error})
      resolve(nullResponse)
    }
    xhr.onload = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (200 <= xhr.status && xhr.status < 300) {
          resolve(xhr.response)
        } else {
          console.error(`Error: HTTP code ${xhr.status}, statusText: ${xhr.statusText}, reason: ${xhr.response?.error?.caused_by?.reason ?? xhr.response?.message}`)
          resolve(nullResponse)
        }
      }
    }
    if (vercel) {
      xhr.open('POST', `${url}${route}`, true)
      xhr.setRequestHeader('Authorization', 'Bearer NTZPMENub0J2NURtblIxQUJRXzA6cXJmNmg2bnpTX2FnSmxGN0hmRWFUUQ==')
    } else {
      xhr.open('POST', `${url}/${route}`, true)
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(`${user}:${password}`))
    }
    xhr.setRequestHeader('Content-type', 'application/json')
    // console.log('xhr request sent')
    xhr.send(JSON.stringify(query))
  })

const getData = async function (method, route, query, vercel) {
  const xhrConfig = vercel
    ? {url: 'https://timeslip.vercel.app' || 'http://192.168.0.14:8010/proxy'} // `npm install -g local-cors-proxy && lcp --proxyUrl https://timeslip.vercel.app
    : {url: 'http://127.0.0.1:9200', user: 'elastic', password: 'changeme'}
  const result = await withXhr(xhrConfig, route, query, vercel)
  window.latestResponse = result
  return result
}

/*
export async function sqlQuery() {
  const facts = await getData(
    'post',
    '_sql?format=json',
    {
      query: 'select count(*) as count from kibana_sample_data_logs group by "@timestamp"',
      columnar: false,
      fetch_size: 20000,
    },
  )
  console.log(facts)
}
*/


export async function dateHistoQuery(
  dataDemand, binUnit, binUnitCount, aggregation, fieldName, queryConfig, searchText, offset, vercel,
) {
  const {lo, hi} = dataDemand
  const {window, alpha, beta, gamma, period, multiplicative, boxplot} = queryConfig
  const testPipelineAgg = window > 0
  const fixedBucketUnit = {
    'millisecond': 'ms',
    'second': 's',
    'minute': 'm',
    'hour': 'h',
  }[binUnit]
  const calendarBucketUnit = {
    'day': 'day',
    'week': 'week',
    'month': 'month',
    'year': 'year',
  }[binUnit]
  const offsetUnit = {
    'second': 'ms',
    'minute': 's',
    'hour': 'm',
    'day': 'h',
    'week': 'day',
    'month': 'day',
    'year': 'month',
  }[binUnit]
  if (!fixedBucketUnit && !calendarBucketUnit) {
    throw new Error(`Timeslip time bin unit ${binUnit} not supported by elasticsearch; allowed values: ${Object.keys({...fixedBucketUnit, ...calendarBucketUnit}).join(',')}`)
  }
  if (fixedBucketUnit && calendarBucketUnit) {
    throw new Error(`Timeslip time bin unit ${binUnit} appears to be both a calendar and fixed unit, which is not yet supported by Timeslip, though elasticsearch supports it`)
  }
  // todo read more at https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-range-query.html
  const requestQuery = {
    query: {
      bool: {
        ...searchText && {
          must: [

            {
              query_string: {
                query: searchText,
                default_field: '*',
              },
            },
          ],
        },
        filter: [{
          range: {
            '@timestamp': {
              gte: new Date(lo.timePointSec * 1000).toISOString(),
              lte: new Date(hi.nextTimePointSec * 1000).toISOString(),
              relation: 'WITHIN', // or not? should check
              // time_zone: 'Europe/Zurich', // this is only needed if the gte/lte is supplied in a local time zone, not UTC
            },
          },
        }],
      },
    },
    aggs: {
      my_date_histo: {
        date_histogram: {
          field: '@timestamp',
          min_doc_count: window === 0 ? 1 : 0,
          ...fixedBucketUnit && {fixed_interval: `${binUnitCount}${fixedBucketUnit}`},
          ...calendarBucketUnit && {calendar_interval: calendarBucketUnit},
          ...offset !== 0 && offsetUnit && {
            offset: `${offset < 0 ? '-' : '+'}${Math.abs(offset)}m`,
          },
        },
        aggs: {
          [testPipelineAgg ? 'the_sum_raw' : 'the_sum']: {
            [boxplot ? 'boxplot' : aggregation]: {field: fieldName},
          },
          ...
          testPipelineAgg && {
            the_sum: {
              moving_fn: {
                buckets_path: 'the_sum_raw',
                window: window,
                // script: `MovingFunctions.holtWinters(values, ${alpha}, ${beta}, ${gamma}, ${period}, ${multiplicative})`,
                script: `MovingFunctions.holt(values, ${alpha}, ${beta})`,
              },
            },
          },
        },
      },
    },
  }

  const facts = await getData(
    'post',
    vercel ? '/api/search' : '_search?request_cache=true&size=0',
    requestQuery,
    vercel,
  )
  const rows = facts.aggregations.my_date_histo.buckets.map(({
                                                               key: epochMs,
                                                               doc_count: count,
                                                               the_sum,
                                                             }) => ({
    epochMs,
    count,
    sum: boxplot ? the_sum?.upper ?? 0 : the_sum?.value ?? 0,
    range: boxplot ? [the_sum?.min ?? 0, the_sum?.max ?? 0] : [the_sum?.value ?? 0],
    boxplot: the_sum,
  }))
  const stats = rows.reduce((p, {epochMs, count, sum, range}) => {
    const {minEpochMs, maxEpochMs, minCount, maxCount, minSum, maxSum} = p
    p.minEpochMs = Math.min(minEpochMs, epochMs)
    p.maxEpochMs = Math.max(maxEpochMs, epochMs)
    p.minCount = Math.min(minCount, count)
    p.maxCount = Math.max(maxCount, count)
    p.minSum = Math.min(minSum, ...range)
    p.maxSum = Math.max(maxSum, ...range)
    return p
  }, {
    minEpochMs: Infinity,
    maxEpochMs: -Infinity,
    minCount: Infinity,
    maxCount: -Infinity,
    minSum: Infinity,
    maxSum: -Infinity,
  })
// console.log({ from: new Date(stats.minEpochMs), to: new Date(stats.maxEpochMs), count: rows.length })
  return {target: dataSource, type: 'dataArrived', dataDemand, dataResponse: {rows, stats}}
}
