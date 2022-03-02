/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FunctionExample {
  syntax: string;
  usage: {
    expression: string;
    help?: string;
  };
}

interface FunctionExampleDict {
  [key: string]: FunctionExample;
}

export const getFunctionExamples = (): FunctionExampleDict => ({
  all: {
    syntax: `all {neq "foo"} {neq "bar"} {neq "fizz"}
all condition={gt 10} condition={lt 20}`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| math "mean(percent_uptime)"
| formatnumber "0.0%"
| metric "Average uptime"
  metricFont={
    font size=48 family="'Open Sans', Helvetica, Arial, sans-serif"
      color={
        if {all {gte 0} {lt 0.8}} then="red" else="green"
      }
      align="center" lHeight=48
  }
| render`,
      help: 'This sets the color of the metric text to `"red"` if the context passed into `metric` is greater than or equal to 0 and less than 0.8. Otherwise, the color is set to `"green"`.',
    },
  },
  alterColumn: {
    syntax: `alterColumn "cost" type="string"
alterColumn column="@timestamp" name="foo"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| alterColumn "time" name="time_in_ms" type="number"
| table
| render`,
      help: 'This renames the `time` column to `time_in_ms` and converts the type of the column’s values from `date` to `number`.',
    },
  },
  any: {
    syntax: `any {eq "foo"} {eq "bar"} {eq "fizz"}
any condition={lte 10} condition={gt 30}`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| filterrows {
    getCell "project" | any {eq "elasticsearch"} {eq "kibana"} {eq "x-pack"}
  }
| pointseries color="project" size="max(price)"
| pie
| render`,
      help: 'This filters out any rows that don’t contain `"elasticsearch"`, `"kibana"` or `"x-pack"` in the `project` field.',
    },
  },
  as: {
    syntax: `as
as "foo"
as name="bar"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| ply by="project" fn={math "count(username)" | as "num_users"} fn={math "mean(price)" | as "price"}
| pointseries x="project" y="num_users" size="price" color="project"
| plot
| render`,
      help: `\`as\` casts any primitive value (\`string\`, \`number\`, \`date\`, \`null\`) into a \`datatable\` with a single row and a single column with the given name (or defaults to \`"value"\` if no name is provided). This is useful when piping a primitive value into a function that only takes \`datatable\` as an input.

In the example, \`ply\` expects each \`fn\` subexpression to return a \`datatable\` in order to merge the results of each \`fn\` back into a \`datatable\`, but using a \`math\` aggregation in the subexpressions returns a single \`math\` value, which is then cast into a \`datatable\` using \`as\`.`,
    },
  },
  asset: {
    syntax: `asset "asset-52f14f2b-fee6-4072-92e8-cd2642665d02"
asset id="asset-498f7429-4d56-42a2-a7e4-8bf08d98d114"`,
    usage: {
      expression: `image dataurl={asset "asset-c661a7cc-11be-45a1-a401-d7592ea7917a"} mode="contain"
| render`,
      help: 'The image asset stored with the ID `"asset-c661a7cc-11be-45a1-a401-d7592ea7917a"` is passed into the `dataurl` argument of the `image` function to display the stored asset.',
    },
  },
  axisConfig: {
    syntax: `axisConfig show=false
axisConfig position="right" min=0 max=10 tickSize=1`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| pointseries x="size(cost)" y="project" color="project"
| plot defaultStyle={seriesStyle bars=0.75 horizontalBars=true}
  legend=false
  xaxis={axisConfig position="top" min=0 max=400 tickSize=100}
  yaxis={axisConfig position="right"}
| render`,
      help: 'This sets the `x-axis` to display on the top of the chart and sets the range of values to `0-400` with ticks displayed at `100` intervals. The `y-axis` is configured to display on the `right`.',
    },
  },
  case: {
    syntax: `case 0 then="red"
case when=5 then="yellow"
case if={lte 50} then="green"`,
    usage: {
      expression: `math "random()"
| progress shape="gauge" label={formatnumber "0%"}
  font={
    font size=24 family="'Open Sans', Helvetica, Arial, sans-serif" align="center"
      color={
        switch {case if={lte 0.5} then="green"}
          {case if={all {gt 0.5} {lte 0.75}} then="orange"}
          default="red"
      }
  }
  valueColor={
    switch {case if={lte 0.5} then="green"}
      {case if={all {gt 0.5} {lte 0.75}} then="orange"}
      default="red"
  }
| render`,
      help: 'This sets the color of the progress indicator and the color of the label to `"green"` if the value is less than or equal to `0.5`, `"orange"` if the value is greater than `0.5` and less than or equal to `0.75`, and `"red"` if `none` of the case conditions are met.',
    },
  },
  clog: {
    syntax: `clog`,
    usage: {
      expression: `kibana
| demodata
| clog
| filterrows fn={getCell "age" | gt 70}
| clog
| pointseries x="time" y="mean(price)"
| plot defaultStyle={seriesStyle lines=1 fill=1}
| render`,
      help: 'This prints the `datatable` objects in the browser console before and after the `filterrows` function.',
    },
  },
  columns: {
    syntax: `columns include="@timestamp, projects, cost"
columns exclude="username, country, age"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| columns include="price, cost, state, project"
| table
| render`,
      help: 'This only keeps the `price`, `cost`, `state`, and `project` columns from the `demodata` data source and removes all other columns.',
    },
  },
  compare: {
    syntax: `compare "neq" to="elasticsearch"
compare op="lte" to=100`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| mapColumn project
  fn={getCell project |
    switch
      {case if={compare eq to=kibana} then=kibana}
      {case if={compare eq to=elasticsearch} then=elasticsearch}
      default="other"
  }
| pointseries size="size(cost)" color="project"
| pie
| render`,
      help: 'This maps all `project` values that aren’t `"kibana"` and `"elasticsearch"` to `"other"`. Alternatively, you can use the individual comparator functions instead of compare.',
    },
  },
  containerStyle: {
    syntax: `containerStyle backgroundColor="red"’
containerStyle borderRadius="50px"
containerStyle border="1px solid black"
containerStyle padding="5px"
containerStyle opacity="0.5"
containerStyle overflow="hidden"
containerStyle backgroundImage={asset id=asset-f40d2292-cf9e-4f2c-8c6f-a504a25e949c}
  backgroundRepeat="no-repeat"
  backgroundSize="cover"`,
    usage: {
      expression: `shape "star" fill="#E61D35" maintainAspect=true
| render containerStyle={
    containerStyle backgroundColor="#F8D546"
      borderRadius="200px"
      border="4px solid #05509F"
      padding="0px"
      opacity="0.9"
      overflow="hidden"
  }`,
    },
  },
  context: {
    syntax: `context`,
    usage: {
      expression: `date
| formatdate "LLLL"
| markdown "Last updated: " {context}
| render`,
      help: 'Using the `context` function allows us to pass the output, or _context_, of the previous function as a value to an argument in the next function. Here we get the formatted date string from the previous function and pass it as `content` for the markdown element.',
    },
  },
  createTable: {
    syntax: `createTable id="a" id="b"    
createTable id="a" name="A" id="b" name="B" rowCount=5`,
    usage: {
      expression: `var_set
name="logs" value={essql "select count(*) as a from kibana_sample_data_logs"}
name="commerce" value={essql "select count(*) as b from kibana_sample_data_ecommerce"}
| createTable ids="totalA" ids="totalB"
| staticColumn name="totalA" value={var "logs" | getCell "a"}
| alterColumn column="totalA" type="number"
| staticColumn name="totalB" value={var "commerce" | getCell "b"}
| alterColumn column="totalB" type="number"
| mathColumn id="percent" name="percent" expression="totalA / totalB"
| render`,
      help: 'This creates a table based on the results of two `essql` queries, joined into one table.',
    },
  },
  csv: {
    syntax: `csv "fruit, stock
  kiwi, 10
  Banana, 5"`,
    usage: {
      expression: `csv "fruit,stock
  kiwi,10
  banana,5"
| pointseries color=fruit size=stock
| pie
| render`,
      help: 'This creates a `datatable` with `fruit` and `stock` columns with two rows. This is useful for quickly mocking data.',
    },
  },
  date: {
    syntax: `date
date value=1558735195
date "2019-05-24T21:59:55+0000"
date "01/31/2019" format="MM/DD/YYYY"`,
    usage: {
      expression: `date
| formatdate "LLL"
| markdown {context}
  font={font family="Arial, sans-serif" size=30 align="left"
    color="#000000"
    weight="normal"
    underline=false
    italic=false}
| render`,
      help: 'Using `date` without passing any arguments will return the current date and time.',
    },
  },
  demodata: {
    syntax: `demodata
demodata "ci"
demodata type="shirts"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| table
| render`,
      help: '`demodata` is a mock data set that you can use to start playing around in Canvas.',
    },
  },
  dropdownControl: {
    syntax: `dropdownControl valueColumn=project filterColumn=project
dropdownControl valueColumn=agent filterColumn=agent.keyword filterGroup=group1`,
    usage: {
      expression: `demodata
| dropdownControl valueColumn=project filterColumn=project
| render`,
      help: 'This creates a dropdown filter element. It requires a data source and uses the unique values from the given `valueColumn` (i.e. `project`) and applies the filter to the `project` column. Note: `filterColumn` should point to a keyword type field for Elasticsearch data sources.',
    },
  },
  eq: {
    syntax: `eq true
eq null
eq 10
eq "foo"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| mapColumn project
  fn={getCell project |
    switch
      {case if={eq kibana} then=kibana}
      {case if={eq elasticsearch} then=elasticsearch}
      default="other"
  }
| pointseries size="size(cost)" color="project"
| pie
| render`,
      help: 'This changes all values in the project column that don’t equal `"kibana"` or `"elasticsearch"` to `"other"`.',
    },
  },
  escount: {
    syntax: `escount index="logstash-*"
escount "currency:\"EUR\"" index="kibana_sample_data_ecommerce"
escount query="response:404" index="kibana_sample_data_logs"`,
    usage: {
      expression: `kibana
| selectFilter
| escount "Cancelled:true" index="kibana_sample_data_flights"
| math "value"
| progress shape="semicircle"
  label={formatnumber 0,0}
  font={font size=24 family="'Open Sans', Helvetica, Arial, sans-serif" color="#000000" align=center}
  max={filters | escount index="kibana_sample_data_flights"}
| render`,
      help: 'The first `escount` expression retrieves the number of flights that were cancelled. The second `escount` expression retrieves the total number of flights.',
    },
  },
  esdocs: {
    syntax: `esdocs index="logstash-*"
esdocs "currency:\"EUR\"" index="kibana_sample_data_ecommerce"
esdocs query="response:404" index="kibana_sample_data_logs"
esdocs index="kibana_sample_data_flights" count=100
esdocs index="kibana_sample_data_flights" sort="AvgTicketPrice, asc"`,
    usage: {
      expression: `kibana
| selectFilter
| esdocs index="kibana_sample_data_ecommerce"
  fields="customer_gender, taxful_total_price, order_date"
  sort="order_date, asc"
  count=10000
| mapColumn "order_date"
  fn={getCell "order_date" | date {context} | rounddate "YYYY-MM-DD"}
| alterColumn "order_date" type="date"
| pointseries x="order_date" y="sum(taxful_total_price)" color="customer_gender"
| plot defaultStyle={seriesStyle lines=3}
  palette={palette "#7ECAE3" "#003A4D" gradient=true}
| render`,
      help: 'This retrieves the first 10000 documents data from the `kibana_sample_data_ecommerce` index sorted by `order_date` in ascending order, and only requests the `customer_gender`, `taxful_total_price`, and `order_date` fields.',
    },
  },
  essql: {
    syntax: `essql query="SELECT * FROM \"logstash*\""
essql "SELECT * FROM \"apm*\"" count=10000`,
    usage: {
      expression: `kibana
| selectFilter
| essql query="SELECT Carrier, FlightDelayMin, AvgTicketPrice FROM   \"kibana_sample_data_flights\""
| table
| render`,
      help: 'This retrieves the `Carrier`, `FlightDelayMin`, and `AvgTicketPrice` fields from the "kibana_sample_data_flights" index.',
    },
  },
  exactly: {
    syntax: `exactly "state" value="running"
exactly "age" value=50 filterGroup="group2"
exactly column="project" value="beats"`,
    usage: {
      expression: `kibana
| selectFilter
| exactly column=project value=elasticsearch
| demodata
| pointseries x=project y="mean(age)"
| plot defaultStyle={seriesStyle bars=1}
| render`,
      help: 'The `exactly` filter here is added to existing filters retrieved by the `filters` function and further filters down the data to only have `"elasticsearch"` data. The `exactly` filter only applies to this one specific element and will not affect other elements in the workpad.',
    },
  },
  filterrows: {
    syntax: `filterrows {getCell "project" | eq "kibana"}
filterrows fn={getCell "age" | gt 50}`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| filterrows {getCell "country" | any {eq "IN"} {eq "US"} {eq "CN"}}
| mapColumn "@timestamp"
  fn={getCell "@timestamp" | rounddate "YYYY-MM"}
| alterColumn "@timestamp" type="date"
| pointseries x="@timestamp" y="mean(cost)" color="country"
| plot defaultStyle={seriesStyle points="2" lines="1"}
  palette={palette "#01A4A4" "#CC6666" "#D0D102" "#616161" "#00A1CB" "#32742C" "#F18D05" "#113F8C" "#61AE24" "#D70060" gradient=false}
| render`,
      help: 'This uses `filterrows` to only keep data from India (`IN`), the United States (`US`), and China (`CN`).',
    },
  },
  filters: {
    syntax: `filters
filters group="timefilter1"
filters group="timefilter2" group="dropdownfilter1" ungrouped=true`,
    usage: {
      expression: `filters group=group2 ungrouped=true
| demodata
| pointseries x="project" y="size(cost)" color="project"
| plot defaultStyle={seriesStyle bars=0.75} legend=false
  font={
    font size=14
    family="'Open Sans', Helvetica, Arial, sans-serif"
    align="left"
    color="#FFFFFF"
    weight="lighter"
    underline=true
    italic=true
  }
| render`,
      help: '`filters` sets the existing filters as context and accepts a `group` parameter to opt into specific filter groups. Setting `ungrouped` to `true` opts out of using global filters.',
    },
  },
  font: {
    syntax: `font size=12
font family=Arial
font align=middle
font color=pink
font weight=lighter
font underline=true
font italic=false
font lHeight=32`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| pointseries x="project" y="size(cost)" color="project"
| plot defaultStyle={seriesStyle bars=0.75} legend=false
  font={
    font size=14
    family="'Open Sans', Helvetica, Arial, sans-serif"
    align="left"
    color="#FFFFFF"
    weight="lighter"
    underline=true
    italic=true
  }
| render`,
    },
  },
  formatdate: {
    syntax: `formatdate format="YYYY-MM-DD"
formatdate "MM/DD/YYYY"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| mapColumn "time" fn={getCell time | formatdate "MMM 'YY"}
| pointseries x="time" y="sum(price)" color="state"
| plot defaultStyle={seriesStyle points=5}
| render`,
      help: 'This transforms the dates in the `time` field into strings that look like `"Jan ‘19"`, `"Feb ‘19"`, etc. using a MomentJS format.',
    },
  },
  formatnumber: {
    syntax: `formatnumber format="$0,0.00"
formatnumber "0.0a"`,
    usage: {
      expression: `kibana
| selectFilter
| demodata
| math "mean(percent_uptime)"
| progress shape="gauge"
  label={formatnumber "0%"}
  font={font size=24 family="'Open Sans', Helvetica, Arial, sans-serif" color="#000000" align="center"}
| render`,
      help: 'The `formatnumber` subexpression receives the same `context` as the `progress` function, which is the output of the `math` function. It formats the value into a percentage.',
    },
  },
});
