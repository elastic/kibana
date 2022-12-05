# [on-week] allow handlebars in action parameters [#146487][]

Worked on during On Week, November 2022, in Pull Request [#146487][].

[#146487]: https://github.com/elastic/kibana/pull/146487

## Goal

Explore using Handlebars as a replacement for Mustache for templating
action parameters for alerting rules.

Mustache is fairly limiting; Handlebars has a concept of 
["helpers"](https://handlebarsjs.com/guide/expressions.html#helpers)
which can provide some ease-of-use capabilities.  Mustache can
provide extendability, but only through new sections (having
begin / end tags).

See [provide mustache functions for ease-of-use in transforming mustache variables](https://github.com/elastic/kibana/issues/84217#top) for general ideas on templating enhancements that have been requested.

## Summary

Handlebars is not completely compatible with Mustache; for example,
[array accessor syntax is different][].  So Mustache will still 
have to be the default template engine, unless a user opts into
using Handlebars instead.  For this PR, we allow a user to opt-in
to Handlebars by using a special comment in their template:

[array accessor syntax is different]: https://handlebarsjs.com/guide/expressions.html#literal-segments

```
{{!@ format: handlebars}}
```

This would need some work to allow to be used in single-line
templates, as it currently requires this line followed by a
new line.

We then implement a number of helpers for handlebars:

- `formatDate` to format date strings
- `formatJson` to format json strings
- `evalMath` to evaluate [TinyMath][] expressions
- `evalJexl` to evaluate [Jexl][] expressions

[Jexl]: https://github.com/TomFrost/Jexl
[TinyMath]: https://www.elastic.co/guide/en/kibana/current/canvas-tinymath-functions.html

We then implement those in Mustache, as section lambdas,
to see how clumsy they get.

In the end, feels like a wash, so despite Handlebars being
more concise, it doesn't feel like it's worth the 
additional cost of support it it.

Note that PR [#146487][] passed CI, but will need more tests, 
especially around error conditions.

The code was also exercised manually to make use of the new
capabilities, and worked fine.  For the purposes of this report,
we'll just note the added jest tests, since they show all the
interesting possibilties.

## helper `formatDate` to format date strings

This helper uses the [moment npm package](https://www.npmjs.com/package/moment)
to parse and generate date strings.

The helper expects a parseable date string, and then additional 
parameters to specify the time zone and output format.  Example:

    {{formatDate timeStamp format="dddd MMM Do YYYY HH:mm:ss.SSS" timeZone="America/New_York"}}

Given the variable `timeStamp` with a value of `2022-11-29T15:52:44Z`,
this would render as 

    Tuesday Nov 29th 2022 10:52:44.000

In Mustache, this can be handled as follows:

    {{#formatDate}}{{timeStamp}} America/New_York dddd MMM Do YYYY HH:mm:ss.SSS{{/formatDate}}

In this case, the ordering is very important.  The Handlebars variables
`format` and `timeZone` above are "hash" variables, and can be specified
in arbitrary order.  For Mustache, we parse that entire string ourselves,
so the order is important.  We may want to come up with some kind of
"hash scheme" for Mustache, but ... I think it will get complex supporting
everything mustache supports.

## helper `formatJson` to format json strings

This helper is really only needed to expand arrays as JSON strings.  Today,
arrays when specified as top-level variables, they will be expanded as 
their `toString()` representation, which is basically 

   arr.map(elem => `${elem}`).join(',')

This helper expects an object, and renders as the JSON representation.
Example:

    {{formatJson context}}

Given the variable `context` with value `{ a: { b: 1 }}`, this would
render as:

    {"a":{"b":1}}

In Mustache, this can be handled as follows:

    {{#formatJson}} context {{/formatJson}}

Note that we are **NOT** expanding `context` like you might expect we would.
We can't!  Because it will get expanded to the `toString()` version!  So,
instead we take a string that we use as the argument to `lodash::get()` 
with the variables object we pass in.  So that string has to be a valid
`lodash::get()` expression, given the variables passed in.  This may get
complex to describe :-)

## helper `evalMath` to evaluate [TinyMath][] expressions

This helper does math!  I've wanted this myself to reduce noisy 
evaluation numbers from threshold rules to decrease decimal places.

This helper expects a TinyMath expression, in a string.  Example:

    {{evalMath '1 + context.a.b'}}

Given the variable `context` with value `{ a: { b: 1 }}`, this would
render as: `3`.

In Mustache, this can be handled as follows:

    {{#evalMath}} 1 + context.a.b {{/evalMath}}

In both Handlebars and Mustache, there is no interstitial variable
expansion - we pass the variable names directly to TinyMath.  That's
because TinyMath itself also evaluates object variables like templating
languages, and we have the proper "current" variables (given section
nesting, etc), so we just let it do the work.  Again, different
"accessor language" perhaps, to deal with.

## helper `evalJexl` to evaluate [Jexl][] expressions

This helper performs arbitrary expression-y things, though needs to be
provided functions to make it useful.  For this PR, we added a number
of string functions.  Other candidates would be URL en/decoding, 
digest functions, etc.

This helper expects a Jexl expression, in a string.  Example:

    {{evalJexl 'e.firstName|toLowerCase + " " + e.lastName|toUpperCase'}}

Given the variable `context` with value `{ e: { firstName: 'Jim', lastName: 'Bob' }}`,
this would render as `jim BOB`.

This works in the same way the `evalMath` helper above works; delegates the
variable expansion to the library, passing it the currently scope variables.