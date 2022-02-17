Basic numeric functions that we already support in Lens:

count()
count(normalize_unit='1s')
sum(field name)
avg(field name)
moving_average(sum(field name), window=5)
moving_average(sum(field name), window=5, normalize_unit='1s')
counter_rate(field name, normalize_unit='1s')
differences(count())
differences(sum(bytes), normalize_unit='1s')
last_value(bytes, sort=timestamp)
percentile(bytes, percent=95)

Adding features beyond what we already support. New features are:

* Filtering
* Math across series
* Time offset

count() * 100
(count() / count(offset=-7d)) + min(field name)
sum(field name, filter='field.keyword: "KQL autocomplete inside math" AND field.value > 100')

What about custom formatting using string manipulation? Probably not...

(avg(bytes) / 1000) + 'kb'
  