# State of Kentucky Automated Vehicle Locations

The source data contains `\N` for null values. We remove these with `sed` and pipe the output to Logstash.
```
sed 's/\\N//g' ./AVL-2018-Complete.csv | /Applications/Elastic/6.4.0/logstash/bin/logstash -f /Users/nickpeihl/Development/Elastic/Geodata/KY_AVL/logstash-avl.conf
```

TODO
* What do the fields mean?
* Can we join this data to road lines and visualize in the GIS app?
* Find useful metrics
* Machine Learning examples