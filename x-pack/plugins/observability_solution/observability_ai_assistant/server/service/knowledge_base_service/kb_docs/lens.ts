/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import type { Logger } from '@kbn/logging';
import type { ObservabilityAIAssistantService } from '../..';

export function addLensDocsToKb({
  service,
}: {
  service: ObservabilityAIAssistantService;
  logger: Logger;
}) {
  service.addCategoryToKnowledgeBase('lens', [
    {
      id: 'lens_formulas_how_it_works',
      texts: [
        `Lens formulas let you do math using a combination of Elasticsearch aggregations and
      math functions. There are three main types of functions:
      
      * Elasticsearch metrics, like \`sum(bytes)\`
      * Time series functions use Elasticsearch metrics as input, like \`cumulative_sum()\`
      * Math functions like \`round()\`
      
      An example formula that uses all of these:
      
      \`\`\`
      round(100 * moving_average(
      average(cpu.load.pct),
      window=10,
      kql='datacenter.name: east*'
      ))
      \`\`\`
      `,
        `Elasticsearch functions take a field name, which can be in quotes. \`sum(bytes)\` is the same
      as \`sum('bytes')\`.
      
      Some functions take named arguments, like \`moving_average(count(), window=5)\`.
      
      Elasticsearch metrics can be filtered using KQL or Lucene syntax. To add a filter, use the named
      parameter \`kql='field: value'\` or \`lucene=''\`. Always use single quotes when writing KQL or Lucene
      queries. If your search has a single quote in it, use a backslash to escape, like: \`kql='Women's'\'
      
      Math functions can take positional arguments, like pow(count(), 3) is the same as count() * count() * count()
      
      Use the symbols +, -, /, and * to perform basic math.`,
      ],
    },
    {
      id: 'lens_common_formulas',
      texts: [
        `The most common formulas are dividing two values to produce a percent. To display accurately, set
      "value format" to "percent"`,
        `### Filter ratio:

      Use \`kql=''\` to filter one set of documents and compare it to other documents within the same grouping.
      For example, to see how the error rate changes over time:

      \`\`\`
      count(kql='response.status_code > 400') / count()
      \`\`\``,
        `### Week over week:

      Use \`shift='1w'\` to get the value of each grouping from
      the previous week. Time shift should not be used with the *Top values* function.

      \`\`\`
      percentile(system.network.in.bytes, percentile=99) /
      percentile(system.network.in.bytes, percentile=99, shift='1w')
      \`\`\``,

        `### Percent of total

      Formulas can calculate \`overall_sum\` for all the groupings,
      which lets you convert each grouping into a percent of total:

      \`\`\`
      sum(products.base_price) / overall_sum(sum(products.base_price))
      \`\`\``,

        `### Recent change

      Use \`reducedTimeRange='30m'\` to add an additional filter on the
      time range of a metric aligned with the end of the global time range.
      This can be used to calculate how much a value changed recently.

      \`\`\`
      max(system.network.in.bytes, reducedTimeRange="30m")
      - min(system.network.in.bytes, reducedTimeRange="30m")
      \`\`\`     
      `,
      ],
    },
    {
      id: 'lens_formulas_elasticsearch_functions',
      texts: [
        `## Elasticsearch functions

      These functions will be executed on the raw documents for each row of the
      resulting table, aggregating all documents matching the break down
      dimensions into a single value.`,

        `#### average(field: string)
      Returns the average of a field. This function only works for number fields.

      Example: Get the average of price: \`average(price)\`

      Example: Get the average of price for orders from the UK: \`average(price, 
      kql='location:UK')\``,

        `#### count([field: string])
      The total number of documents. When you provide a field, the total number of 
      field values is counted. When you use the Count function for fields that have 
      multiple values in a single document, all values are counted.

      To calculate the total number of documents, use \`count().\`

      To calculate the number of products in all orders, use \`count(products.id)\`.

      To calculate the number of documents that match a specific filter, use 
      \`count(kql='price > 500')\`.`,

        `#### last_value(field: string)
      Returns the value of a field from the last document, ordered by the default 
      time field of the data view.

      This function is usefull the retrieve the latest state of an entity.

      Example: Get the current status of server A: \`last_value(server.status, 
      kql='server.name="A"')\``,

        `#### max(field: string)
      Returns the max of a field. This function only works for number fields.

      Example: Get the max of price: \`max(price)\`

      Example: Get the max of price for orders from the UK: \`max(price, 
      kql='location:UK')\``,

        `#### median(field: string)
      Returns the median of a field. This function only works for number fields.

      Example: Get the median of price: \`median(price)\`

      Example: Get the median of price for orders from the UK: \`median(price, 
      kql='location:UK')\``,

        `#### min(field: string)
      Returns the min of a field. This function only works for number fields.

      Example: Get the min of price: \`min(price)\`

      Example: Get the min of price for orders from the UK: \`min(price, 
      kql='location:UK')\``,

        `#### percentile(field: string, [percentile]: number)
      Returns the specified percentile of the values of a field. This is the value n 
      percent of the values occuring in documents are smaller.

      Example: Get the number of bytes larger than 95 % of values: 
      \`percentile(bytes, percentile=95)\``,

        `#### percentile_rank(field: string, [value]: number)
      Returns the percentage of values which are below a certain value. For example, 
      if a value is greater than or equal to 95% of the observed values it is said to 
      be at the 95th percentile rank

      Example: Get the percentage of values which are below of 100: 
      \`percentile_rank(bytes, value=100)\``,

        `#### standard_deviation(field: string)
      Returns the amount of variation or dispersion of the field. The function works 
      only for number fields.

      Example: To get the standard deviation of price, use 
      \`standard_deviation(price).\`

      Example: To get the variance of price for orders from the UK, use 
      \`square(standard_deviation(price, kql='location:UK'))\`.`,

        `#### sum(field: string)
      Returns the sum of a field. This function only works for number fields.

      Example: Get the sum of price: sum(price)

      Example: Get the sum of price for orders from the UK: \`sum(price, 
      kql='location:UK')\``,

        `#### unique_count(field: string)
      Calculates the number of unique values of a specified field. Works for number, 
      string, date and boolean values.

      Example: Calculate the number of different products: 
      \`unique_count(product.name)\`

      Example: Calculate the number of different products from the "clothes" group: 
      \`unique_count(product.name, kql='product.group=clothes')\`
            
      `,
      ],
    },
    {
      id: 'lens_formulas_column_functions',
      texts: [
        `## Column calculations
      These functions are executed for each row, but are provided with the whole 
      column as context. This is also known as a window function.`,

        `#### counter_rate(metric: number)
      Calculates the rate of an ever increasing counter. This function will only 
      yield helpful results on counter metric fields which contain a measurement of 
      some kind monotonically growing over time. If the value does get smaller, it 
      will interpret this as a counter reset. To get most precise results, 
      counter_rate should be calculated on the max of a field.
      
      This calculation will be done separately for separate series defined by filters 
      or top values dimensions. It uses the current interval when used in Formula.
      
      Example: Visualize the rate of bytes received over time by a memcached server: 
      counter_rate(max(memcached.stats.read.bytes))`,

        `cumulative_sum(metric: number)
      Calculates the cumulative sum of a metric over time, adding all previous values 
      of a series to each value. To use this function, you need to configure a date 
      histogram dimension as well.
      
      This calculation will be done separately for separate series defined by filters 
      or top values dimensions.
      
      Example: Visualize the received bytes accumulated over time: 
      cumulative_sum(sum(bytes))`,

        `differences(metric: number)
      Calculates the difference to the last value of a metric over time. To use this 
      function, you need to configure a date histogram dimension as well. Differences 
      requires the data to be sequential. If your data is empty when using 
      differences, try increasing the date histogram interval.
      
      This calculation will be done separately for separate series defined by filters 
      or top values dimensions.
      
      Example: Visualize the change in bytes received over time: 
      differences(sum(bytes))`,

        `moving_average(metric: number, [window]: number)
      Calculates the moving average of a metric over time, averaging the last n-th 
      values to calculate the current value. To use this function, you need to 
      configure a date histogram dimension as well. The default window value is 5.
      
      This calculation will be done separately for separate series defined by filters 
      or top values dimensions.
      
      Takes a named parameter window which specifies how many last values to include 
      in the average calculation for the current value.
      
      Example: Smooth a line of measurements: moving_average(sum(bytes), window=5)`,

        `normalize_by_unit(metric: number, unit: s|m|h|d|w|M|y)
      This advanced function is useful for normalizing counts and sums to a specific 
      time interval. It allows for integration with metrics that are stored already 
      normalized to a specific time interval.
      
      This function can only be used if there's a date histogram function used in the 
      current chart.
      
      Example: A ratio comparing an already normalized metric to another metric that 
      needs to be normalized. 
      normalize_by_unit(counter_rate(max(system.diskio.write.bytes)), unit='s') / 
      last_value(apache.status.bytes_per_second)`,

        `overall_average(metric: number)
      Calculates the average of a metric for all data points of a series in the 
      current chart. A series is defined by a dimension using a date histogram or 
      interval function. Other dimensions breaking down the data like top values or 
      filter are treated as separate series.
      
      If no date histograms or interval functions are used in the current chart, 
      overall_average is calculating the average over all dimensions no matter the 
      used function
      
      Example: Divergence from the mean: sum(bytes) - overall_average(sum(bytes))`,

        `overall_max(metric: number)
      Calculates the maximum of a metric for all data points of a series in the 
      current chart. A series is defined by a dimension using a date histogram or 
      interval function. Other dimensions breaking down the data like top values or 
      filter are treated as separate series.
      
      If no date histograms or interval functions are used in the current chart, 
      overall_max is calculating the maximum over all dimensions no matter the used 
      function
      
      Example: Percentage of range (sum(bytes) - overall_min(sum(bytes))) / 
      (overall_max(sum(bytes)) - overall_min(sum(bytes)))`,

        `overall_min(metric: number)
      Calculates the minimum of a metric for all data points of a series in the 
      current chart. A series is defined by a dimension using a date histogram or 
      interval function. Other dimensions breaking down the data like top values or 
      filter are treated as separate series.
      
      If no date histograms or interval functions are used in the current chart, 
      overall_min is calculating the minimum over all dimensions no matter the used 
      function
      
      Example: Percentage of range (sum(bytes) - overall_min(sum(bytes)) / 
      (overall_max(sum(bytes)) - overall_min(sum(bytes)))`,

        `overall_sum(metric: number)
      Calculates the sum of a metric of all data points of a series in the current 
      chart. A series is defined by a dimension using a date histogram or interval 
      function. Other dimensions breaking down the data like top values or filter are 
      treated as separate series.
      
      If no date histograms or interval functions are used in the current chart, 
      overall_sum is calculating the sum over all dimensions no matter the used 
      function.
      
      Example: Percentage of total sum(bytes) / overall_sum(sum(bytes))`,
      ],
    },
    {
      id: 'lens_formulas_math_functions',
      texts: [
        `Math
      These functions will be executed for reach row of the resulting table using single values from the same row calculated using other functions.`,

        `abs([value]: number)
      Calculates absolute value. A negative value is multiplied by -1, a positive value stays the same.
      
      Example: Calculate average distance to sea level abs(average(altitude))`,

        `add([left]: number, [right]: number)
      Adds up two numbers.
      
      Also works with + symbol.
      
      Example: Calculate the sum of two fields
      
      sum(price) + sum(tax)
      
      Example: Offset count by a static value
      
      add(count(), 5)`,

        `cbrt([value]: number)
      Cube root of value.
      
      Example: Calculate side length from volume
      
      cbrt(last_value(volume))
      
      ceil([value]: number)
      Ceiling of value, rounds up.
      
      Example: Round up price to the next dollar
      
      ceil(sum(price))`,

        `clamp([value]: number, [min]: number, [max]: number)
      Limits the value from a minimum to maximum.
      
      Example: Make sure to catch outliers
      
      clamp(
        average(bytes),
        percentile(bytes, percentile=5),
        percentile(bytes, percentile=95)
      )`,
        `cube([value]: number)
      Calculates the cube of a number.
      
      Example: Calculate volume from side length
      
      cube(last_value(length))`,

        `defaults([value]: number, [default]: number)
      Returns a default numeric value when value is null.
      
      Example: Return -1 when a field has no data
      
      defaults(average(bytes), -1)`,

        `divide([left]: number, [right]: number)
      Divides the first number by the second number.
      
      Also works with / symbol
      
      Example: Calculate profit margin
      
      sum(profit) / sum(revenue)
      
      Example: divide(sum(bytes), 2)`,

        `exp([value]: number)
      Raises e to the nth power.
      
      Example: Calculate the natural exponential function
      
      exp(last_value(duration))`,

        `fix([value]: number)
      For positive values, takes the floor. For negative values, takes the ceiling.
      
      Example: Rounding towards zero
      
      fix(sum(profit))`,

        `floor([value]: number)
      Round down to nearest integer value
      
      Example: Round down a price
      
      floor(sum(price))`,

        `log([value]: number, [base]?: number)
      Logarithm with optional base. The natural base e is used as default.
      
      Example: Calculate number of bits required to store values
      
      log(sum(bytes))
      log(sum(bytes), 2)`,
        `mod([value]: number, [base]: number)
      Remainder after dividing the function by a number
      
      Example: Calculate last three digits of a value
      
      mod(sum(price), 1000)`,

        `multiply([left]: number, [right]: number)
      Multiplies two numbers.
      
      Also works with * symbol.
      
      Example: Calculate price after current tax rate
      
      sum(bytes) * last_value(tax_rate)
      
      Example: Calculate price after constant tax rate
      
      multiply(sum(price), 1.2)`,

        `pick_max([left]: number, [right]: number)
      Finds the maximum value between two numbers.
      
      Example: Find the maximum between two fields averages
      
      pick_max(average(bytes), average(memory))`,

        `pick_min([left]: number, [right]: number)
      Finds the minimum value between two numbers.
      
      Example: Find the minimum between two fields averages
      
      pick_min(average(bytes), average(memory))`,

        `pow([value]: number, [base]: number)
      Raises the value to a certain power. The second argument is required
      
      Example: Calculate volume based on side length
      
      pow(last_value(length), 3)`,

        `round([value]: number, [decimals]?: number)
      Rounds to a specific number of decimal places, default of 0
      
      Examples: Round to the cent
      
      round(sum(bytes))
      round(sum(bytes), 2)`,
        `sqrt([value]: number)
      Square root of a positive value only
      
      Example: Calculate side length based on area
      
      sqrt(last_value(area))`,

        `square([value]: number)
      Raise the value to the 2nd power
      
      Example: Calculate area based on side length
      
      square(last_value(length))`,

        `subtract([left]: number, [right]: number)
      Subtracts the first number from the second number.
      
      Also works with - symbol.
      
      Example: Calculate the range of a field
      
      subtract(max(bytes), min(bytes))`,
      ],
    },
    {
      id: 'lens_formulas_comparison_functions',
      texts: [
        `Comparison
      These functions are used to perform value comparison.`,

        `eq([left]: number, [right]: number)
      Performs an equality comparison between two values.
      
      To be used as condition for ifelse comparison function.
      
      Also works with == symbol.
      
      Example: Returns true if the average of bytes is exactly the same amount of average memory
      
      average(bytes) == average(memory)
      
      Example: eq(sum(bytes), 1000000)`,

        `gt([left]: number, [right]: number)
      Performs a greater than comparison between two values.
      
      To be used as condition for ifelse comparison function.
      
      Also works with > symbol.
      
      Example: Returns true if the average of bytes is greater than the average amount of memory
      
      average(bytes) > average(memory)
      
      Example: gt(average(bytes), 1000)`,

        `gte([left]: number, [right]: number)
      Performs a greater than comparison between two values.
      
      To be used as condition for ifelse comparison function.
      
      Also works with >= symbol.
      
      Example: Returns true if the average of bytes is greater than or equal to the average amount of memory
      
      average(bytes) >= average(memory)
      
      Example: gte(average(bytes), 1000)`,

        `ifelse([condition]: boolean, [left]: number, [right]: number)
      Returns a value depending on whether the element of condition is true or false.
      
      Example: Average revenue per customer but in some cases customer id is not provided which counts as additional customer
      
      sum(total)/(unique_count(customer_id) + ifelse( count() > count(kql='customer_id:*'), 1, 0))`,

        `lt([left]: number, [right]: number)
      Performs a lower than comparison between two values.
      
      To be used as condition for ifelse comparison function.
      
      Also works with < symbol.
      
      Example: Returns true if the average of bytes is lower than the average amount of memory
      
      average(bytes) <= average(memory)
      
      Example: lt(average(bytes), 1000)`,

        `lte([left]: number, [right]: number)
      Performs a lower than or equal comparison between two values.
      
      To be used as condition for ifelse comparison function.
      
      Also works with <= symbol.
      
      Example: Returns true if the average of bytes is lower than or equal to the average amount of memory
      
      average(bytes) <= average(memory)
      
      Example: lte(average(bytes), 1000)`,
      ],
    },
    {
      id: 'lens_formulas_kibana_context',
      text: dedent(`Kibana context

      These functions are used to retrieve Kibana context variables, which are the 
      date histogram \`interval\`, the current \`now\` and the selected \`time_range\`
      and help you to compute date math operations.
      
      interval()
      The specified minimum interval for the date histogram, in milliseconds (ms).
      
      now()
      The current now moment used in Kibana expressed in milliseconds (ms).
      
      time_range()
      The specified time range, in milliseconds (ms).`),
    },
  ]);
}
